import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router, adminProcedure } from "./_core/trpc";
import * as db from "./db";
import { processarOperacao, emitirNfse, COD_LOCACAO, COD_INTERMEDIACAO } from "./fiscal";
import { ENV } from "./_core/env";

// Plano de contas (chart_accounts): árvore de profundidade livre. Contas principais
// (parentId nulo) definem a natureza (grupo); sub-contas em qualquer nível herdam a
// natureza da conta principal ancestral. Usado pelos lançamentos e pelo desconto de aluguel.

type ChartAccountGrupo = "conta_principal" | "despesa_fixa" | "despesa_variavel" | "receita" | "aporte_capital";
// Naturezas lançáveis (usadas em Receitas/Despesas/Aportes); "conta_principal" é apenas um contêiner sem natureza definida.
const CHART_ACCOUNT_GRUPOS: Exclude<ChartAccountGrupo, "conta_principal">[] = ["despesa_fixa", "despesa_variavel", "receita", "aporte_capital"];
const CHART_ACCOUNT_MAX_DEPTH = 3; // 4 níveis: 0=conta principal, 1=conta, 2=subconta, 3=sub-subconta

const num = (v: number | string | null) => Number(v ?? 0);

/** Resolve uma conta do plano de contas, validando que pertence a um dos grupos permitidos, e monta o caminho exibido ("Principal > Conta > Sub-conta"). */
async function resolveChartAccount<T extends ChartAccountGrupo>(ownerId: number, chartAccountId: number, gruposPermitidos: T[]) {
  const contas = await db.listChartAccounts(ownerId);
  const conta = contas.find((c) => c.id === chartAccountId);
  if (!conta) throw new Error("Conta do plano de contas não encontrada.");
  if (!gruposPermitidos.includes(conta.grupo as T)) throw new Error("Conta selecionada não pertence ao grupo esperado.");
  const porId = new Map(contas.map((c) => [c.id, c]));
  const caminho: string[] = [conta.nome];
  let atual = conta;
  while (atual.parentId) {
    const pai = porId.get(atual.parentId);
    if (!pai) break;
    caminho.unshift(pai.nome);
    atual = pai;
  }
  return { conta: { ...conta, grupo: conta.grupo as T }, nome: caminho.join(" > ") };
}

/** Profundidade de uma conta (0 = conta principal), contando os ancestrais via parentId. */
function depthOf(contas: { id: number; parentId: number | null }[], accountId: number): number {
  const porId = new Map(contas.map((c) => [c.id, c]));
  let depth = 0;
  let atual = porId.get(accountId);
  while (atual?.parentId) {
    depth++;
    atual = porId.get(atual.parentId);
  }
  return depth;
}

const competenciaSchema = z.string().regex(/^\d{4}-\d{2}$/);

/** Soma meses a uma data "AAAA-MM-DD", retornando "AAAA-MM" da competência resultante */
function addMonthsToCompetencia(competencia: string, months: number): string {
  const [y, m] = competencia.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Data de vencimento: dia informado no mês seguinte à competência (ajustado para o fim do mês se necessário) */
function calcularVencimento(competencia: string, dia: number): string {
  const proxima = addMonthsToCompetencia(competencia, 1);
  const [y, m] = proxima.split("-").map(Number);
  const ultimoDiaDoMes = new Date(y, m, 0).getDate();
  const diaAjustado = Math.min(dia, ultimoDiaDoMes);
  return `${proxima}-${String(diaAjustado).padStart(2, "0")}`;
}

/** Soma meses a uma data "AAAA-MM-DD", preservando o dia (ajustado para o fim do mês se necessário) */
function addMonthsToDate(data: string, months: number): string {
  const [y, m, d] = data.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const ultimoDiaDoMes = new Date(ny, nm, 0).getDate();
  const diaAjustado = Math.min(d, ultimoDiaDoMes);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(diaAjustado).padStart(2, "0")}`;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => {
      if (!opts.ctx.user) return null;
      const { passwordHash, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Onboarding: classificação obrigatória no primeiro acesso
  onboarding: router({
    save: protectedProcedure
      .input(
        z.object({
          userType: z.enum(["administradora", "admin_airbnb", "proprietario", "holding", "gestor_temporada_pj"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, {
          userType: input.userType,
        });
        return { success: true };
      }),
  }),

  // ------------------------------------------------------------- profile
  profile: router({
    get: protectedProcedure.query(({ ctx }) => {
      const { passwordHash, ...safeUser } = ctx.user;
      return safeUser;
    }),
    update: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          razaoSocial: z.string().optional(),
          cnpj: z.string().optional(),
          cpfResponsavel: z.string().optional(),
          nomeResponsavel: z.string().optional(),
          telefone: z.string().optional(),
          email: z.string().email().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const data: Record<string, unknown> = {};
        if (input.name !== undefined) data.name = input.name;
        if (input.razaoSocial !== undefined) data.razaoSocial = input.razaoSocial;
        if (input.cnpj !== undefined) data.cnpj = input.cnpj.replace(/\D/g, "");
        if (input.cpfResponsavel !== undefined) data.cpfResponsavel = input.cpfResponsavel.replace(/\D/g, "");
        if (input.nomeResponsavel !== undefined) data.nomeResponsavel = input.nomeResponsavel;
        if (input.telefone !== undefined) data.telefone = input.telefone.replace(/\D/g, "");
        if (input.email !== undefined) {
          const newEmail = input.email.toLowerCase().trim();
          if (newEmail !== ctx.user.email) {
            // Verificar se o e-mail já está em uso por outro usuário
            const { getDb } = await import("./db");
            const database = await getDb();
            if (database) {
              const { users } = await import("../drizzle/schema");
              const existing = await database.select().from(users).where(eq(users.email, newEmail)).limit(1);
              if (existing.length > 0 && existing[0].id !== ctx.user.id) {
                throw new Error("Este e-mail já está em uso por outra conta.");
              }
            }
          }
          data.email = newEmail;
        }
        await db.updateUserProfile(ctx.user.id, data as any);
        return { success: true };
      }),
  }),

  // ------------------------------------------------------------- team (gerenciamento de usuários)
  // Apenas donos do sistema (invitedBy = null) podem gerenciar usuários
  team: router({
    list: protectedProcedure.query(({ ctx }) => {
      if (ctx.user.invitedBy) throw new Error("Apenas o dono do sistema pode gerenciar usuários.");
      return db.listTeamUsers(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          password: z.string().min(6),
          telefone: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.invitedBy) throw new Error("Apenas o dono do sistema pode adicionar usuários.");
        await db.createTeamUser({
          ownerId: ctx.user.id,
          name: input.name,
          email: input.email,
          password: input.password,
          telefone: input.telefone,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.invitedBy) throw new Error("Apenas o dono do sistema pode remover usuários.");
        await db.deleteTeamUser(ctx.user.id, input.id);
        return { success: true };
      }),
  }),

  // ------------------------------------------------------------- clients
  clients: router({
    list: protectedProcedure.query(({ ctx }) => db.listClients(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => db.getClient(ctx.user.id, input.id)),
    create: protectedProcedure
      .input(
        z.object({
          tipo: z.enum(["PF", "PJ"]),
          nome: z.string().min(1),
          cpfCnpj: z.string().min(1),
          email: z.string().optional(),
          telefone: z.string().optional(),
          fiscalCategory: z.enum(["pj", "pf_cbs_ibs", "pf_isento"]).default("pj"),
          certificadoA1Nome: z.string().optional(),
          certificadoA1Validade: z.string().optional(), // "AAAA-MM-DD"
        }),
      )
      .mutation(({ ctx, input }) =>
        db.createClient({
          ownerId: ctx.user.id,
          tipo: input.tipo,
          nome: input.nome,
          cpfCnpj: input.cpfCnpj,
          email: input.email || null,
          telefone: input.telefone || null,
          fiscalCategory: input.fiscalCategory,
          certificadoA1Nome: input.certificadoA1Nome || null,
          certificadoA1Validade: input.certificadoA1Validade ? new Date(input.certificadoA1Validade) : null,
        }),
      ),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          tipo: z.enum(["PF", "PJ"]).optional(),
          nome: z.string().optional(),
          cpfCnpj: z.string().optional(),
          email: z.string().optional(),
          telefone: z.string().optional(),
          fiscalCategory: z.enum(["pj", "pf_cbs_ibs", "pf_isento"]).optional(),
          certificadoA1Nome: z.string().optional(),
          certificadoA1Validade: z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        const { id, certificadoA1Validade, ...rest } = input;
        return db.updateClient(ctx.user.id, id, {
          ...rest,
          ...(certificadoA1Validade !== undefined ? { certificadoA1Validade: certificadoA1Validade ? new Date(certificadoA1Validade) : null } : {}),
        });
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteClient(ctx.user.id, input.id)),
  }),

  // ---------------------------------------------------------- properties
  properties: router({
    list: protectedProcedure.query(({ ctx }) => db.listProperties(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => db.getProperty(ctx.user.id, input.id)),
    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number().optional(),
          apelido: z.string().min(1),
          endereco: z.string().optional(),
          comissaoPct: z.number().min(0).max(100),
          custoFaxina: z.number().min(0).default(0),
          tipoLocacao: z.enum(["curta", "longa"]).default("curta"),
          imobiliariaId: z.number().optional(),
          tipoAdministracao: z.enum(["propria", "administradora", "gestor_curta_temporada"]).default("propria"),
          gestorId: z.number().optional(),
          financiado: z.enum(["sim", "nao"]).default("nao"),
          tipoFinanciamento: z.enum(["financiamento", "consorcio"]).optional(),
          valorParcela: z.number().min(0).optional(),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.createProperty({
          ownerId: ctx.user.id,
          clientId: input.clientId ?? null,
          apelido: input.apelido,
          endereco: input.endereco || null,
          comissaoPct: String(input.comissaoPct),
          custoFaxina: String(input.custoFaxina),
          tipoLocacao: input.tipoLocacao,
          imobiliariaId: input.imobiliariaId ?? null,
          tipoAdministracao: input.tipoAdministracao,
          gestorId: input.gestorId ?? null,
          financiado: input.financiado,
          tipoFinanciamento: input.tipoFinanciamento ?? null,
          valorParcela: input.valorParcela !== undefined ? String(input.valorParcela) : null,
        }),
      ),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number().optional(),
          apelido: z.string().optional(),
          endereco: z.string().optional(),
          comissaoPct: z.number().optional(),
          custoFaxina: z.number().min(0).optional(),
          tipoLocacao: z.enum(["curta", "longa"]).optional(),
          imobiliariaId: z.number().nullable().optional(),
          tipoAdministracao: z.enum(["propria", "administradora", "gestor_curta_temporada"]).optional(),
          gestorId: z.number().nullable().optional(),
          financiado: z.enum(["sim", "nao"]).optional(),
          tipoFinanciamento: z.enum(["financiamento", "consorcio"]).nullable().optional(),
          valorParcela: z.number().min(0).nullable().optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        const { id, comissaoPct, custoFaxina, valorParcela, ...rest } = input;
        return db.updateProperty(ctx.user.id, id, {
          ...rest,
          ...(comissaoPct !== undefined ? { comissaoPct: String(comissaoPct) } : {}),
          ...(custoFaxina !== undefined ? { custoFaxina: String(custoFaxina) } : {}),
          ...(valorParcela !== undefined ? { valorParcela: valorParcela !== null ? String(valorParcela) : null } : {}),
        });
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteProperty(ctx.user.id, input.id)),
  }),

  // ------------------------------------------------------------- imobiliarias
  imobiliarias: router({
    list: protectedProcedure.query(({ ctx }) => db.listImobiliarias(ctx.user.id)),
    create: protectedProcedure
      .input(
        z.object({
          nome: z.string().min(1),
          telefone: z.string().optional(),
          celular: z.string().optional(),
          whatsapp: z.string().optional(),
          email: z.string().optional(),
          contato: z.string().optional(),
          endereco: z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.createImobiliaria({
          ownerId: ctx.user.id,
          nome: input.nome,
          telefone: input.telefone || null,
          celular: input.celular || null,
          whatsapp: input.whatsapp || null,
          email: input.email || null,
          contato: input.contato || null,
          endereco: input.endereco || null,
        }),
      ),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          telefone: z.string().optional(),
          celular: z.string().optional(),
          whatsapp: z.string().optional(),
          email: z.string().optional(),
          contato: z.string().optional(),
          endereco: z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        const { id, ...rest } = input;
        return db.updateImobiliaria(ctx.user.id, id, rest);
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteImobiliaria(ctx.user.id, input.id)),
  }),

  // ------------------------------------------------------------- gestores de temporada (curta_managers)
  curtaManagers: router({
    list: protectedProcedure.query(({ ctx }) => db.listCurtaManagers(ctx.user.id)),
    create: protectedProcedure
      .input(
        z.object({
          nome: z.string().min(1),
          telefone: z.string().optional(),
          email: z.string().optional(),
          contato: z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.createCurtaManager({
          ownerId: ctx.user.id,
          nome: input.nome,
          telefone: input.telefone || null,
          email: input.email || null,
          contato: input.contato || null,
        }),
      ),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          telefone: z.string().optional(),
          email: z.string().optional(),
          contato: z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        const { id, ...rest } = input;
        return db.updateCurtaManager(ctx.user.id, id, rest);
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteCurtaManager(ctx.user.id, input.id)),
  }),

  // ------------------------------------------------------------- plano de contas
  chartAccounts: router({
    list: protectedProcedure
      .input(z.object({ grupo: z.enum(["conta_principal", "despesa_fixa", "despesa_variavel", "receita", "aporte_capital"]).optional() }).optional())
      .query(async ({ ctx, input }) => {
        const all = await db.seedDefaultChartAccountsIfNeeded(ctx.user.id);
        return input?.grupo ? all.filter((a) => a.grupo === input.grupo) : all;
      }),
    create: protectedProcedure
      .input(
        z.object({
          grupo: z.enum(["conta_principal", "despesa_fixa", "despesa_variavel", "receita", "aporte_capital"]).optional(),
          nome: z.string().min(1),
          parentId: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        let grupo = input.grupo;
        if (input.parentId) {
          const contas = await db.listChartAccounts(ctx.user.id);
          const pai = contas.find((c) => c.id === input.parentId);
          if (!pai) throw new Error("Conta-pai não encontrada.");
          // Sub-conta herda a natureza da conta-pai. Plano de contas tem exatamente 4 níveis fixos.
          if (depthOf(contas, pai.id) >= CHART_ACCOUNT_MAX_DEPTH) {
            throw new Error("O plano de contas permite no máximo 4 níveis (conta principal › conta › subconta › sub-subconta).");
          }
          grupo = pai.grupo;
        }
        if (!grupo) throw new Error("Selecione a natureza da conta principal.");
        return db.createChartAccount({ ownerId: ctx.user.id, grupo, nome: input.nome, parentId: input.parentId ?? null, ativa: 1 });
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), nome: z.string().optional(), ativa: z.number().min(0).max(1).optional() }))
      .mutation(({ ctx, input }) => db.updateChartAccount(ctx.user.id, input.id, { nome: input.nome, ativa: input.ativa })),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteChartAccount(ctx.user.id, input.id)),
  }),

  // --------------------------------------------------------- lançamentos (receitas, despesas, aportes)
  ledgerEntries: router({
    list: protectedProcedure
      .input(
        z.object({
          propertyId: z.number().optional(),
          grupo: z.enum(["despesa_fixa", "despesa_variavel", "receita", "aporte_capital"]).optional(),
        }),
      )
      .query(({ ctx, input }) => db.listLedgerEntries(ctx.user.id, input.propertyId, input.grupo)),
    create: protectedProcedure
      .input(
        z.object({
          propertyId: z.number(),
          chartAccountId: z.number(),
          descricao: z.string().optional(),
          contraparte: z.string().optional(),
          valor: z.number().positive(),
          dia: z.number().int().min(1).max(31),
          competenciaInicio: z.string().regex(/^\d{4}-\d{2}$/),
          qtdMeses: z.number().int().positive().default(1),
          observacao: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { conta, nome } = await resolveChartAccount(ctx.user.id, input.chartAccountId, CHART_ACCOUNT_GRUPOS);
        return db.createLedgerEntry({
          ownerId: ctx.user.id,
          propertyId: input.propertyId,
          chartAccountId: conta.id,
          grupo: conta.grupo,
          categoria: nome,
          descricao: input.descricao || null,
          contraparte: input.contraparte || null,
          valor: String(input.valor),
          dia: input.dia,
          competenciaInicio: input.competenciaInicio,
          qtdMeses: input.qtdMeses,
          observacao: input.observacao || null,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          propertyId: z.number().optional(),
          chartAccountId: z.number().optional(),
          descricao: z.string().optional(),
          contraparte: z.string().optional(),
          valor: z.number().positive().optional(),
          dia: z.number().int().min(1).max(31).optional(),
          competenciaInicio: z.string().regex(/^\d{4}-\d{2}$/).optional(),
          qtdMeses: z.number().int().positive().optional(),
          observacao: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, valor, chartAccountId, ...rest } = input;
        let contaFields = {};
        if (chartAccountId !== undefined) {
          const { conta, nome } = await resolveChartAccount(ctx.user.id, chartAccountId, CHART_ACCOUNT_GRUPOS);
          contaFields = { chartAccountId: conta.id, grupo: conta.grupo, categoria: nome };
        }
        return db.updateLedgerEntry(ctx.user.id, id, {
          ...rest,
          ...contaFields,
          ...(valor !== undefined ? { valor: String(valor) } : {}),
        });
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteLedgerEntry(ctx.user.id, input.id)),
  }),

  // --------------------------------------------------------- guarantee types
  guaranteeTypes: router({
    list: protectedProcedure.query(({ ctx }) => db.seedDefaultGuaranteeTypesIfNeeded(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({ nome: z.string().min(1) }))
      .mutation(({ ctx, input }) => db.createGuaranteeType({ ownerId: ctx.user.id, nome: input.nome, ativa: 1 })),
    update: protectedProcedure
      .input(z.object({ id: z.number(), nome: z.string().optional(), ativa: z.number().min(0).max(1).optional() }))
      .mutation(({ ctx, input }) => db.updateGuaranteeType(ctx.user.id, input.id, { nome: input.nome, ativa: input.ativa })),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteGuaranteeType(ctx.user.id, input.id)),
  }),

  // ------------------------------------------------------------- fornecedores
  fornecedores: router({
    list: protectedProcedure.query(({ ctx }) => db.listFornecedores(ctx.user.id)),
    create: protectedProcedure
      .input(
        z.object({
          nome: z.string().min(1),
          cpfCnpj: z.string().optional(),
          telefone: z.string().optional(),
          email: z.string().optional(),
          chartAccountId: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (input.chartAccountId) {
          await resolveChartAccount(ctx.user.id, input.chartAccountId, ["despesa_fixa", "despesa_variavel"]);
        }
        return db.createFornecedor({
          ownerId: ctx.user.id,
          nome: input.nome,
          cpfCnpj: input.cpfCnpj || null,
          telefone: input.telefone || null,
          email: input.email || null,
          chartAccountId: input.chartAccountId || null,
          ativo: 1,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          cpfCnpj: z.string().optional(),
          telefone: z.string().optional(),
          email: z.string().optional(),
          chartAccountId: z.number().nullable().optional(),
          ativo: z.number().min(0).max(1).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...rest } = input;
        if (rest.chartAccountId) {
          await resolveChartAccount(ctx.user.id, rest.chartAccountId, ["despesa_fixa", "despesa_variavel"]);
        }
        return db.updateFornecedor(ctx.user.id, id, rest);
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteFornecedor(ctx.user.id, input.id)),
  }),

  // -------------------------------------------------------- inventory items
  inventoryItems: router({
    list: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(({ ctx, input }) => db.listInventoryItems(ctx.user.id, input.propertyId)),
    create: protectedProcedure
      .input(
        z.object({
          propertyId: z.number(),
          nome: z.string().min(1),
          quantidade: z.number().int().positive().default(1),
          descricao: z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.createInventoryItem({
          ownerId: ctx.user.id,
          propertyId: input.propertyId,
          nome: input.nome,
          quantidade: input.quantidade,
          descricao: input.descricao || null,
        }),
      ),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          quantidade: z.number().int().positive().optional(),
          descricao: z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        const { id, ...rest } = input;
        return db.updateInventoryItem(ctx.user.id, id, rest);
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteInventoryItem(ctx.user.id, input.id)),
  }),

  // -------------------------------------------------- long term contracts (aluguel de longa duração)
  longTermContracts: router({
    list: protectedProcedure
      .input(z.object({ propertyId: z.number().optional() }))
      .query(({ ctx, input }) => db.listLongTermContracts(ctx.user.id, input.propertyId)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => db.getLongTermContract(ctx.user.id, input.id)),
    create: protectedProcedure
      .input(
        z.object({
          propertyId: z.number(),
          dataInicio: z.string(),
          indiceCorrecao: z.string().default("IGPM"),
          nomeInquilino: z.string().optional(),
          cpfCnpjInquilino: z.string().optional(),
          contatoInquilino: z.string().optional(),
          telefoneInquilino: z.string().optional(),
          celularInquilino: z.string().optional(),
          whatsappInquilino: z.string().optional(),
          emailInquilino: z.string().optional(),
          carenciaInicio: z.string().optional(),
          carenciaFim: z.string().optional(),
          prazoMeses: z.number().int().positive().default(12),
          diaVencimentoAluguel: z.number().int().min(1).max(31).default(10),
          tipoGarantia: z.string().optional(),
          comissaoPct: z.number().min(0).max(100).default(0),
          tipoAdministracao: z.enum(["propria", "administradora", "gestor_curta_temporada"]).default("propria"),
          valorAluguel: z.number().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { valorAluguel, ...rest } = input;

        // Fim do contrato: início + prazo em meses. Reajuste: sempre a cada 12 meses a partir do início.
        const dataFim = addMonthsToDate(rest.dataInicio, rest.prazoMeses);
        const dataReajuste = addMonthsToDate(rest.dataInicio, 12);

        const contractId = await db.createLongTermContract({
          ownerId: ctx.user.id,
          propertyId: rest.propertyId,
          dataInicio: rest.dataInicio,
          dataFim,
          dataReajuste,
          indiceCorrecao: rest.indiceCorrecao,
          nomeInquilino: rest.nomeInquilino || null,
          cpfCnpjInquilino: rest.cpfCnpjInquilino || null,
          contatoInquilino: rest.contatoInquilino || null,
          telefoneInquilino: rest.telefoneInquilino || null,
          celularInquilino: rest.celularInquilino || null,
          whatsappInquilino: rest.whatsappInquilino || null,
          emailInquilino: rest.emailInquilino || null,
          carenciaInicio: rest.carenciaInicio || null,
          carenciaFim: rest.carenciaFim || null,
          prazoMeses: rest.prazoMeses,
          diaVencimentoAluguel: rest.diaVencimentoAluguel,
          tipoGarantia: rest.tipoGarantia || null,
          comissaoPct: String(rest.comissaoPct),
          tipoAdministracao: rest.tipoAdministracao,
        });

        // Primeiro aluguel devido: mês seguinte ao fim da carência (aluguel é pago postecipado).
        // Sem carência, cobra a partir do próprio mês de início.
        const inicioCobranca = rest.carenciaFim
          ? addMonthsToCompetencia(rest.carenciaFim.slice(0, 7), 1)
          : rest.dataInicio.slice(0, 7);
        for (let i = 0; i < rest.prazoMeses; i++) {
          const competencia = addMonthsToCompetencia(inicioCobranca, i);
          // O mês em que o contrato termina não gera cobrança (o contrato já encerrou nesse dia).
          if (competencia >= dataFim.slice(0, 7)) break;
          await db.createContractRentCharge({
            ownerId: ctx.user.id,
            contractId,
            propertyId: rest.propertyId,
            valor: String(valorAluguel),
            competencia,
            dataVencimento: calcularVencimento(competencia, rest.diaVencimentoAluguel),
            status: "pendente",
          });
        }

        return { id: contractId };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          dataInicio: z.string().optional(),
          dataFim: z.string().optional(),
          dataReajuste: z.string().optional(),
          indiceCorrecao: z.string().optional(),
          nomeInquilino: z.string().optional(),
          cpfCnpjInquilino: z.string().optional(),
          contatoInquilino: z.string().optional(),
          telefoneInquilino: z.string().optional(),
          celularInquilino: z.string().optional(),
          whatsappInquilino: z.string().optional(),
          emailInquilino: z.string().optional(),
          carenciaInicio: z.string().optional(),
          carenciaFim: z.string().optional(),
          prazoMeses: z.number().int().positive().optional(),
          diaVencimentoAluguel: z.number().int().min(1).max(31).optional(),
          tipoGarantia: z.string().optional(),
          comissaoPct: z.number().min(0).max(100).optional(),
          tipoAdministracao: z.enum(["propria", "administradora", "gestor_curta_temporada"]).optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        const { id, dataInicio, dataFim, dataReajuste, carenciaInicio, carenciaFim, comissaoPct, ...rest } = input;
        return db.updateLongTermContract(ctx.user.id, id, {
          ...rest,
          ...(comissaoPct !== undefined ? { comissaoPct: String(comissaoPct) } : {}),
          ...(dataInicio !== undefined ? { dataInicio } : {}),
          ...(dataFim !== undefined ? { dataFim } : {}),
          ...(dataReajuste !== undefined ? { dataReajuste } : {}),
          ...(carenciaInicio !== undefined ? { carenciaInicio } : {}),
          ...(carenciaFim !== undefined ? { carenciaFim } : {}),
        });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const parcelas = await db.listContractRentCharges(ctx.user.id, input.id);
        for (const p of parcelas) {
          if (p.descontoLedgerEntryId) await db.deleteLedgerEntry(ctx.user.id, p.descontoLedgerEntryId);
        }
        return db.deleteLongTermContract(ctx.user.id, input.id);
      }),

    // ---- recebíveis (parcelas) do contrato
    charges: protectedProcedure
      .input(z.object({ contractId: z.number().optional() }))
      .query(({ ctx, input }) => db.listContractRentCharges(ctx.user.id, input.contractId)),
    addCharge: protectedProcedure
      .input(
        z.object({
          contractId: z.number(),
          propertyId: z.number(),
          valor: z.number().positive(),
          competencia: competenciaSchema,
          dataVencimento: z.string(),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.createContractRentCharge({
          ownerId: ctx.user.id,
          contractId: input.contractId,
          propertyId: input.propertyId,
          valor: String(input.valor),
          competencia: input.competencia,
          dataVencimento: input.dataVencimento,
          status: "pendente",
        }),
      ),
    markReceived: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          dataRecebimento: z.string().optional(),
          multaJuros: z.number().min(0).default(0),
          desconto: z.number().min(0).default(0),
          descontoChartAccountId: z.number().optional(),
          descontoDescricao: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const charge = await db.getContractRentCharge(ctx.user.id, input.id);
        if (!charge) throw new Error("Parcela não encontrada.");

        // Se já havia um desconto anterior vinculado (ex.: reenviando o formulário), remove o lançamento antigo primeiro.
        if (charge.descontoLedgerEntryId) {
          await db.deleteLedgerEntry(ctx.user.id, charge.descontoLedgerEntryId);
        }

        let descontoLedgerEntryId: number | null = null;
        if (input.desconto > 0) {
          // Conta é opcional: se a pessoa descreveu o motivo, não precisa classificar por conta (e vice-versa).
          let contaResolvida: { conta: { id: number; grupo: "despesa_fixa" | "despesa_variavel" }; nome: string } | null = null;
          if (input.descontoChartAccountId) {
            contaResolvida = await resolveChartAccount(ctx.user.id, input.descontoChartAccountId, ["despesa_fixa", "despesa_variavel"]);
          }
          descontoLedgerEntryId = await db.createLedgerEntry({
            ownerId: ctx.user.id,
            propertyId: charge.propertyId,
            chartAccountId: contaResolvida?.conta.id ?? null,
            grupo: contaResolvida?.conta.grupo ?? "despesa_variavel",
            categoria: contaResolvida?.nome ?? null,
            valor: String(input.desconto),
            dia: 1,
            competenciaInicio: charge.competencia,
            qtdMeses: 1,
            descricao: input.descontoDescricao?.trim() || `Desconto concedido — aluguel ${charge.competencia}`,
          });
        }

        const valorRecebido = num(charge.valor) + input.multaJuros - input.desconto;

        await db.updateContractRentCharge(ctx.user.id, input.id, {
          status: "recebido",
          dataRecebimento: input.dataRecebimento || new Date().toISOString().slice(0, 10),
          multaJuros: String(input.multaJuros),
          desconto: String(input.desconto),
          valorRecebido: String(valorRecebido),
          descontoLedgerEntryId,
        });

        return { success: true };
      }),
    markPending: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const charge = await db.getContractRentCharge(ctx.user.id, input.id);
        if (charge?.descontoLedgerEntryId) {
          await db.deleteLedgerEntry(ctx.user.id, charge.descontoLedgerEntryId);
        }
        return db.updateContractRentCharge(ctx.user.id, input.id, {
          status: "pendente",
          dataRecebimento: null,
          multaJuros: "0.00",
          desconto: "0.00",
          valorRecebido: null,
          descontoLedgerEntryId: null,
        });
      }),
    updateCharge: protectedProcedure
      .input(z.object({ id: z.number(), valor: z.number().positive().optional(), dataVencimento: z.string().optional() }))
      .mutation(({ ctx, input }) => {
        const { id, valor, dataVencimento } = input;
        return db.updateContractRentCharge(ctx.user.id, id, {
          ...(valor !== undefined ? { valor: String(valor) } : {}),
          ...(dataVencimento !== undefined ? { dataVencimento } : {}),
        });
      }),
    deleteCharge: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const charge = await db.getContractRentCharge(ctx.user.id, input.id);
        if (charge?.descontoLedgerEntryId) {
          await db.deleteLedgerEntry(ctx.user.id, charge.descontoLedgerEntryId);
        }
        return db.deleteContractRentCharge(ctx.user.id, input.id);
      }),
  }),

  // --------------------------------------------------------- reservations
  reservations: router({
    list: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), competencia: z.string().optional() }))
      .query(({ ctx, input }) => db.listReservations(ctx.user.id, input.propertyId, input.competencia)),
    create: protectedProcedure
      .input(
        z.object({
          propertyId: z.number(),
          codigo: z.string().min(1),
          valorBruto: z.number().positive(),
          taxaLimpeza: z.number().min(0),
          taxaAirbnb: z.number().min(0).default(0),
          outrasTaxas: z.number().min(0).default(0),
          valorLiquidoRecebido: z.number().min(0).default(0),
          checkin: z.string(),
          checkout: z.string(),
          noites: z.number().int().positive(),
          faxinasUtilizadas: z.number().int().min(0).default(1),
          nomeHospede: z.string().optional(),
          cpfHospede: z.string().optional(),
          passaporteHospede: z.string().optional(),
          estrangeiro: z.boolean().default(false),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.createReservation({
          ownerId: ctx.user.id,
          propertyId: input.propertyId,
          codigo: input.codigo,
          valorBruto: String(input.valorBruto),
          taxaLimpeza: String(input.taxaLimpeza),
          taxaAirbnb: String(input.taxaAirbnb),
          outrasTaxas: String(input.outrasTaxas),
          valorLiquidoRecebido: String(input.valorLiquidoRecebido),
          checkin: input.checkin,
          checkout: input.checkout,
          noites: input.noites,
          faxinasUtilizadas: input.faxinasUtilizadas,
          competencia: input.checkin.slice(0, 7),
          nomeHospede: input.nomeHospede || null,
          cpfHospede: input.cpfHospede || null,
          passaporteHospede: input.passaporteHospede || null,
          estrangeiro: input.estrangeiro ? 1 : 0,
        });

        // Gerar despesa automática de faxina se houver custo configurado no imóvel
        if (input.faxinasUtilizadas > 0) {
          const prop = await db.getProperty(ctx.user.id, input.propertyId);
          const custoUnit = Number(prop?.custoFaxina ?? 0);
          if (custoUnit > 0) {
            const totalFaxina = custoUnit * input.faxinasUtilizadas;
            // Precisamos do ID da reserva recém-criada para vincular
            const allRes = await db.listReservations(ctx.user.id, input.propertyId, input.checkin.slice(0, 7));
            const reservaCriada = allRes.find(r => r.codigo === input.codigo);
            await db.createLedgerEntry({
              ownerId: ctx.user.id,
              propertyId: input.propertyId,
              chartAccountId: null,
              grupo: "despesa_variavel",
              categoria: "Faxineira",
              valor: String(totalFaxina),
              dia: Number(input.checkin.slice(8, 10)) || 1,
              competenciaInicio: input.checkin.slice(0, 7),
              qtdMeses: 1,
              descricao: `Faxina automática — Reserva ${input.codigo} (${input.faxinasUtilizadas}x R$ ${custoUnit.toFixed(2)})`,
              reservationId: reservaCriada?.id ?? null,
            });
          }
        }
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          codigo: z.string().optional(),
          valorBruto: z.number().positive().optional(),
          taxaLimpeza: z.number().min(0).optional(),
          taxaAirbnb: z.number().min(0).optional(),
          outrasTaxas: z.number().min(0).optional(),
          valorLiquidoRecebido: z.number().min(0).optional(),
          checkin: z.string().optional(),
          checkout: z.string().optional(),
          noites: z.number().int().positive().optional(),
          faxinasUtilizadas: z.number().int().min(0).optional(),
          nomeHospede: z.string().optional(),
          cpfHospede: z.string().optional(),
          passaporteHospede: z.string().optional(),
          estrangeiro: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, valorBruto, taxaLimpeza, taxaAirbnb, outrasTaxas, valorLiquidoRecebido, checkin, checkout, faxinasUtilizadas, estrangeiro, ...rest } = input;

        // Verificar se há NFS-e emitida — bloquear edição de campos fiscais e de período
        const notasExistentes = await db.listInvoicesByReservation(ctx.user.id, id);
        if (notasExistentes.length > 0) {
          const camposBloqueados = valorBruto !== undefined || taxaLimpeza !== undefined || taxaAirbnb !== undefined || checkin !== undefined || checkout !== undefined || rest.codigo !== undefined;
          if (camposBloqueados) {
            throw new Error("Não é possível alterar valores, período ou código de uma reserva com NFS-e já emitida. Cancele as notas primeiro.");
          }
        }

        await db.updateReservation(ctx.user.id, id, {
          ...rest,
          ...(valorBruto !== undefined ? { valorBruto: String(valorBruto) } : {}),
          ...(taxaLimpeza !== undefined ? { taxaLimpeza: String(taxaLimpeza) } : {}),
          ...(taxaAirbnb !== undefined ? { taxaAirbnb: String(taxaAirbnb) } : {}),
          ...(outrasTaxas !== undefined ? { outrasTaxas: String(outrasTaxas) } : {}),
          ...(valorLiquidoRecebido !== undefined ? { valorLiquidoRecebido: String(valorLiquidoRecebido) } : {}),
          ...(checkin !== undefined ? { checkin, competencia: checkin.slice(0, 7) } : {}),
          ...(checkout !== undefined ? { checkout } : {}),
          ...(faxinasUtilizadas !== undefined ? { faxinasUtilizadas } : {}),
          ...(estrangeiro !== undefined ? { estrangeiro: estrangeiro ? 1 : 0 } : {}),
        });

        // Reconciliar despesa automática de faxina se faxinasUtilizadas mudou
        if (faxinasUtilizadas !== undefined) {
          const reserva = await db.getReservation(ctx.user.id, id);
          if (reserva) {
            // Remover despesa antiga vinculada usando helper de delete por reservationId
            await db.deleteLedgerEntriesByReservation(ctx.user.id, id);
            // Recriar se faxinas > 0
            if (faxinasUtilizadas > 0) {
              const prop = await db.getProperty(ctx.user.id, reserva.propertyId);
              const custoUnit = Number(prop?.custoFaxina ?? 0);
              if (custoUnit > 0) {
                await db.createLedgerEntry({
                  ownerId: ctx.user.id,
                  propertyId: reserva.propertyId,
                  chartAccountId: null,
                  grupo: "despesa_variavel",
                  categoria: "Faxineira",
                  valor: String(custoUnit * faxinasUtilizadas),
                  dia: Number(reserva.checkin.slice(8, 10)) || 1,
                  competenciaInicio: reserva.competencia,
                  qtdMeses: 1,
                  descricao: `Faxina automática — Reserva ${reserva.codigo} (${faxinasUtilizadas}x R$ ${custoUnit.toFixed(2)})`,
                  reservationId: id,
                });
              }
            }
          }
        }
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteReservation(ctx.user.id, input.id)),

    // Importação de CSV do Airbnb
    importCsv: protectedProcedure
      .input(
        z.object({
          propertyId: z.number(),
          rows: z.array(
            z.object({
              codigo: z.string(),
              valorBruto: z.number(),
              taxaLimpeza: z.number(),
              taxaAirbnb: z.number().default(0),
              outrasTaxas: z.number().default(0),
              valorLiquidoRecebido: z.number().default(0),
              nomeHospede: z.string().optional(),
              cpfHospede: z.string().optional(),
              passaporteHospede: z.string().optional(),
              estrangeiro: z.boolean().default(false),
              checkin: z.string(),
              checkout: z.string(),
              noites: z.number().int().positive(),
              faxinasUtilizadas: z.number().int().min(0).default(1),
            }),
          ),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const prop = await db.getProperty(ctx.user.id, input.propertyId);
        if (!prop) throw new Error("Imóvel não encontrado");
        const custoUnit = Number(prop.custoFaxina ?? 0);
        let importadas = 0;

        for (const row of input.rows) {
          await db.createReservation({
            ownerId: ctx.user.id,
            propertyId: input.propertyId,
            codigo: row.codigo,
            valorBruto: String(row.valorBruto),
            taxaLimpeza: String(row.taxaLimpeza),
            taxaAirbnb: String(row.taxaAirbnb),
            outrasTaxas: String(row.outrasTaxas),
            valorLiquidoRecebido: String(row.valorLiquidoRecebido),
            nomeHospede: row.nomeHospede || null,
            cpfHospede: row.cpfHospede || null,
            passaporteHospede: row.passaporteHospede || null,
            estrangeiro: row.estrangeiro ? 1 : 0,
            checkin: row.checkin,
            checkout: row.checkout,
            noites: row.noites,
            faxinasUtilizadas: row.faxinasUtilizadas,
            competencia: row.checkin.slice(0, 7),
          });

          // Gerar despesa de faxina automática
          if (row.faxinasUtilizadas > 0 && custoUnit > 0) {
            const totalFaxina = custoUnit * row.faxinasUtilizadas;
            const allRes = await db.listReservations(ctx.user.id, input.propertyId, row.checkin.slice(0, 7));
            const reservaCriada = allRes.find(r => r.codigo === row.codigo);
            await db.createLedgerEntry({
              ownerId: ctx.user.id,
              propertyId: input.propertyId,
              chartAccountId: null,
              grupo: "despesa_variavel",
              categoria: "Faxineira",
              valor: String(totalFaxina),
              dia: Number(row.checkin.slice(8, 10)) || 1,
              competenciaInicio: row.checkin.slice(0, 7),
              qtdMeses: 1,
              descricao: `Faxina automática — Reserva ${row.codigo} (${row.faxinasUtilizadas}x R$ ${custoUnit.toFixed(2)})`,
              reservationId: reservaCriada?.id ?? null,
            });
          }
          importadas++;
        }

        return { importadas };
      }),

    // Nota fiscal por reserva
    invoices: protectedProcedure
      .input(z.object({ reservationId: z.number() }))
      .query(({ ctx, input }) => db.listInvoicesByReservation(ctx.user.id, input.reservationId)),

    // Notas por imóvel (para o extrato de repasse), filtradas por competência
    invoicesByProperty: protectedProcedure
      .input(z.object({ propertyId: z.number(), competencia: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ ctx, input }) => {
        const reservas = await db.listReservations(ctx.user.id, input.propertyId, input.competencia);
        const ids = new Set(reservas.map((r) => r.id));
        const notas = await db.listInvoicesByProperty(ctx.user.id, input.propertyId);
        return notas.filter((n) => n.reservationId != null && ids.has(n.reservationId));
      }),

    emitir: protectedProcedure
      .input(z.object({ reservationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const reserva = await db.getReservation(ctx.user.id, input.reservationId);
        if (!reserva) throw new Error("Reserva não encontrada");
        const prop = await db.getProperty(ctx.user.id, reserva.propertyId);
        if (!prop) throw new Error("Imóvel não encontrado");
        const cliente = prop.clientId ? await db.getClient(ctx.user.id, prop.clientId) : null;
        if (!cliente && prop.clientId) throw new Error("Cliente não encontrado");

        // limpa notas anteriores desta reserva (idempotência simples)
        await db.deleteInvoicesByReservation(ctx.user.id, input.reservationId);

        const resultado = processarOperacao({
          reservaCodigo: reserva.codigo,
          propriedadeApelido: prop.apelido,
          checkin: reserva.checkin,
          checkout: reserva.checkout,
          noites: reserva.noites,
          valorBruto: num(reserva.valorBruto),
          taxaLimpeza: num(reserva.taxaLimpeza),
          taxaAirbnb: num(reserva.taxaAirbnb),
          comissaoPct: num(prop.comissaoPct),
          admin: {
            cnpj: "00.000.000/0001-00",
            razaoSocial: ctx.user.name || "Administradora",
          },
          proprietario: cliente
            ? { nome: cliente.nome, cpfCnpj: cliente.cpfCnpj, tipo: cliente.tipo }
            : { nome: ctx.user.name || "Holding", cpfCnpj: "", tipo: "PJ" as const },
          fiscalCategory: (cliente?.fiscalCategory as "pj" | "pf_cbs_ibs" | "pf_isento") ?? "pj",
        });

        // Emite nota de comissão (sempre)
        const respComissao = await emitirNfse(resultado.notaComissao);
        await db.createInvoice({
          ownerId: ctx.user.id,
          reservationId: reserva.id,
          propertyId: prop.id,
          tipo: "comissao",
          codigoServico: COD_INTERMEDIACAO,
          valorServicos: String(resultado.comissaoAdmin),
          status: "autorizada",
          chaveAcesso: respComissao.chaveAcesso,
          numeroNfse: respComissao.numeroNfse,
          payloadJson: JSON.stringify(resultado.notaComissao),
          respostaJson: JSON.stringify(respComissao),
        });

        // Nota de locação: apenas se não for PF isento
        let respLocacao = null;
        if (resultado.gerarNotaLocacao) {
          respLocacao = await emitirNfse(resultado.notaLocacao);
          await db.createInvoice({
            ownerId: ctx.user.id,
            reservationId: reserva.id,
            propertyId: prop.id,
            tipo: "locacao",
            codigoServico: COD_LOCACAO,
            valorServicos: String(resultado.receitaLocacao),
            baseCalculo: String(resultado.baseTributavelLocacao),
            cbs: String(resultado.cbsLocacao),
            ibs: String(resultado.ibsLocacao),
            status: "autorizada",
            chaveAcesso: respLocacao.chaveAcesso,
            numeroNfse: respLocacao.numeroNfse,
            payloadJson: JSON.stringify(resultado.notaLocacao),
            respostaJson: JSON.stringify(respLocacao),
          });
        }

        return { resultado, respComissao, respLocacao };
      }),
  }),

  // --------------------------------------------------------------- DRE
  dre: router({
    porUnidade: protectedProcedure
      .input(z.object({ propertyId: z.number(), competencia: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ ctx, input }) => {
        const prop = await db.getProperty(ctx.user.id, input.propertyId);
        if (!prop) throw new Error("Imóvel não encontrado");
        const cliente = prop.clientId ? await db.getClient(ctx.user.id, prop.clientId) : null;

        const reservas = await db.listReservations(ctx.user.id, input.propertyId, input.competencia);
        const despesasFixasRaw = await db.listLedgerEntriesNaCompetencia(ctx.user.id, input.propertyId, input.competencia, "despesa_fixa");
        const despesasVariaveisRaw = await db.listLedgerEntriesNaCompetencia(ctx.user.id, input.propertyId, input.competencia, "despesa_variavel");
        const receitasManuaisRaw = await db.listLedgerEntriesNaCompetencia(ctx.user.id, input.propertyId, input.competencia, "receita");
        const aportesRaw = await db.listLedgerEntriesNaCompetencia(ctx.user.id, input.propertyId, input.competencia, "aporte_capital");

        let receitaBruta = 0;
        let taxaAirbnb = 0;
        let comissao = 0;
        let cbs = 0;
        let ibs = 0;
        let liquidoProp = 0;
        const comissaoPct = num(prop.comissaoPct);
        let totalParcelasLonga = 0;

        for (const r of reservas) {
          const res = processarOperacao({
            reservaCodigo: r.codigo,
            propriedadeApelido: prop.apelido,
            checkin: r.checkin,
            checkout: r.checkout,
            noites: r.noites,
            valorBruto: num(r.valorBruto),
            taxaLimpeza: num(r.taxaLimpeza),
            taxaAirbnb: num(r.taxaAirbnb),
            comissaoPct,
            admin: { cnpj: "", razaoSocial: "" },
            proprietario: { nome: cliente?.nome || "", cpfCnpj: cliente?.cpfCnpj || "", tipo: cliente?.tipo || "PF" },
            fiscalCategory: (cliente?.fiscalCategory as "pj" | "pf_cbs_ibs" | "pf_isento") ?? "pj",
          });
          receitaBruta += res.receitaLocacao;
          taxaAirbnb += res.taxaAirbnb;
          comissao += res.comissaoAdmin;
          cbs += res.cbsLocacao;
          ibs += res.ibsLocacao;
          liquidoProp += res.liquidoProprietario;
        }

        // Receita de aluguel de longa duração: parcelas do contrato com competência neste mês.
        if (prop.tipoLocacao === "longa") {
          const parcelas = await db.listContractRentChargesByProperty(ctx.user.id, input.propertyId, input.competencia);
          const contratos = await db.listLongTermContracts(ctx.user.id, input.propertyId);
          const contrato = contratos[0];
          const comissaoPctLonga = contrato && contrato.tipoAdministracao !== "propria" ? num(contrato.comissaoPct) : 0;
          for (const p of parcelas) {
            const valorParcela = num(p.valor);
            const comissaoParcela = valorParcela * (comissaoPctLonga / 100);
            receitaBruta += valorParcela;
            comissao += comissaoParcela;
            liquidoProp += valorParcela - comissaoParcela;
            totalParcelasLonga++;
          }
        }

        const despesasFixas = despesasFixasRaw.map((e) => ({ ...e, valor: num(e.valor) }));
        const despesasVariaveis = despesasVariaveisRaw.map((e) => ({ ...e, valor: num(e.valor) }));
        const receitasManuais = receitasManuaisRaw.map((e) => ({ ...e, valor: num(e.valor) }));
        const aportes = aportesRaw.map((e) => ({ ...e, valor: num(e.valor) }));

        const totalDespesasFixas = despesasFixas.reduce((s, e) => s + e.valor, 0);
        const totalDespesasVariaveis = despesasVariaveis.reduce((s, e) => s + e.valor, 0);
        const totalDespesas = totalDespesasFixas + totalDespesasVariaveis;
        const totalReceitasManuais = receitasManuais.reduce((s, e) => s + e.valor, 0);
        const totalAportes = aportes.reduce((s, e) => s + e.valor, 0);

        // Receitas lançadas manualmente somam ao resultado sem incidência de comissão
        // (comissão é específica da locação, já calculada acima a partir de reservas/contratos).
        const resultadoProprietario = liquidoProp + totalReceitasManuais - totalDespesas;

        const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

        return {
          propriedade: prop,
          cliente,
          competencia: input.competencia,
          totalReservas: reservas.length + totalParcelasLonga,
          receitaBruta: round2(receitaBruta),
          taxaAirbnb: round2(taxaAirbnb),
          comissao: round2(comissao),
          cbs: round2(cbs),
          ibs: round2(ibs),
          repasseBruto: round2(liquidoProp),
          despesasFixas,
          totalDespesasFixas: round2(totalDespesasFixas),
          despesasVariaveis,
          totalDespesasVariaveis: round2(totalDespesasVariaveis),
          totalDespesas: round2(totalDespesas),
          receitasManuais,
          totalReceitasManuais: round2(totalReceitasManuais),
          aportes,
          totalAportes: round2(totalAportes),
          resultadoProprietario: round2(resultadoProprietario),
        };
      }),

    // DRE consolidado da empresa: soma os lançamentos (Receitas/Despesas/Aportes) de todos os
    // imóveis para a competência, organizados pelas contas do plano de contas.
    empresa: protectedProcedure
      .input(z.object({ competencia: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ ctx, input }) => {
        const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
        const grupos = ["receita", "despesa_fixa", "despesa_variavel", "aporte_capital"] as const;

        const secoes = await Promise.all(
          grupos.map(async (grupo) => {
            const todos = await db.listLedgerEntries(ctx.user.id, undefined, grupo);
            const doMes = todos.filter((e) => db.competenciaNaSerie(e.competenciaInicio, e.qtdMeses, input.competencia));

            const porConta = new Map<string, number>();
            for (const e of doMes) {
              const chave = e.categoria || "Sem conta";
              porConta.set(chave, (porConta.get(chave) ?? 0) + num(e.valor));
            }
            const contas = Array.from(porConta.entries())
              .map(([nome, total]) => ({ nome, total: round2(total) }))
              .sort((a, b) => b.total - a.total);

            return { grupo, contas, total: round2(contas.reduce((s, c) => s + c.total, 0)) };
          }),
        );

        const porGrupo = Object.fromEntries(secoes.map((s) => [s.grupo, s])) as Record<(typeof grupos)[number], (typeof secoes)[number]>;

        const totalReceitas = porGrupo.receita.total;
        const totalDespesasFixas = porGrupo.despesa_fixa.total;
        const totalDespesasVariaveis = porGrupo.despesa_variavel.total;
        const totalAportes = porGrupo.aporte_capital.total;

        return {
          competencia: input.competencia,
          receitas: porGrupo.receita,
          despesasFixas: porGrupo.despesa_fixa,
          despesasVariaveis: porGrupo.despesa_variavel,
          aportes: porGrupo.aporte_capital,
          totalReceitas,
          totalDespesasFixas,
          totalDespesasVariaveis,
          totalDespesas: round2(totalDespesasFixas + totalDespesasVariaveis),
          totalAportes,
          resultado: round2(totalReceitas - totalDespesasFixas - totalDespesasVariaveis),
        };
      }),
  }),

  // --------------------------------------------------------- dashboard
  dashboard: router({
    overview: protectedProcedure
      .input(z.object({ competencia: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ ctx, input }) => {
        const clientes = await db.listClients(ctx.user.id);
        const props = await db.listProperties(ctx.user.id);
        const reservas = await db.listReservations(ctx.user.id, undefined, input.competencia);

        const propMap = new Map(props.map((p) => [p.id, p]));
        let comissaoMes = 0;
        let receitaMes = 0;
        for (const r of reservas) {
          const p = propMap.get(r.propertyId);
          const comissaoPct = p ? num(p.comissaoPct) : 0;
          const receita = num(r.valorBruto) + num(r.taxaLimpeza);
          receitaMes += receita;
          comissaoMes += receita * (comissaoPct / 100);
        }

        // alertas de vencimento de certificado A1 (próximos 60 dias ou vencidos)
        const hoje = new Date();
        const limite = new Date();
        limite.setDate(limite.getDate() + 60);
        const alertasCertificado = clientes
          .filter((c) => c.certificadoA1Validade)
          .map((c) => {
            const validade = new Date(c.certificadoA1Validade as unknown as string);
            const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
            return { clienteId: c.id, nome: c.nome, validade: validade.toISOString().slice(0, 10), diasRestantes };
          })
          .filter((a) => a.diasRestantes <= 60)
          .sort((a, b) => a.diasRestantes - b.diasRestantes);

        const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

        return {
          totalClientes: clientes.length,
          totalImoveis: props.length,
          totalReservasMes: reservas.length,
          receitaMes: round2(receitaMes),
          comissaoMes: round2(comissaoMes),
          alertasCertificado,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
