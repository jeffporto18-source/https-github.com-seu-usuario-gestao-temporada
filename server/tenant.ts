import { TRPCError } from "@trpc/server";

import * as db from "./db";
import { protectedProcedure } from "./_core/trpc";
import type { NivelAcesso } from "../drizzle/schema";

/** Cookie que guarda a empresa em operação. O valor é só uma dica: o servidor revalida sempre. */
export const TENANT_COOKIE = "empresa_ativa";

/**
 * Sinaliza ao frontend que o usuário atende mais de uma empresa e ainda não escolheu qual operar.
 * A tela de seleção reage a esta mensagem.
 */
export const PRECISA_ESCOLHER_EMPRESA = "PRECISA_ESCOLHER_EMPRESA";

function lerCookie(cabecalho: string | undefined, nome: string): string | undefined {
  if (!cabecalho) return undefined;
  for (const parte of cabecalho.split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === nome) return decodeURIComponent(resto.join("="));
  }
  return undefined;
}

/** Resultado da decisão de acesso — ou uma empresa liberada, ou o motivo da recusa. */
export type Decisao<T> = { ok: true; acesso: T } | { ok: false; motivo: "sem_acesso" | "precisa_escolher" };

/**
 * Decide qual empresa a requisição opera. É a regra de segurança do sistema multiempresa, isolada
 * aqui como função pura para poder ser testada diretamente.
 *
 * O cookie diz apenas o que o usuário escolheu — nunca concede nada por si. A lista de acessos vem
 * do banco, e uma empresa só é liberada se estiver nela. Um cookie forjado com o id de outra
 * empresa é descartado, e a decisão segue como se ele não existisse.
 */
export function escolherAcesso<T extends { tenantOwnerId: number }>(
  acessos: T[],
  empresaEscolhida: string | undefined,
): Decisao<T> {
  if (acessos.length === 0) return { ok: false, motivo: "sem_acesso" };

  if (empresaEscolhida) {
    const acesso = acessos.find((a) => String(a.tenantOwnerId) === empresaEscolhida);
    if (acesso) return { ok: true, acesso };
    // Escolha inválida (empresa inexistente, sem acesso, ou acesso revogado): ignora e segue para
    // a regra abaixo. Nunca cai para "a primeira da lista" nem para a empresa pedida.
  }

  if (acessos.length === 1) return { ok: true, acesso: acessos[0] };

  return { ok: false, motivo: "precisa_escolher" };
}

/**
 * Mesma resolução de empresa das rotas tRPC, exportada para as rotas de upload — que rodam em
 * Express puro (multipart/form-data, que o tRPC não lida bem) e por isso ficaram de fora da
 * conversão para multiempresa: usavam `user.id` como se fosse a empresa, e um contador anexando
 * documento num cliente recebia "não encontrado" para um imóvel que existia, só não sob a conta
 * dele.
 */
export async function resolverEmpresa(userId: number, cookieHeader: string | undefined) {
  const acessos = await db.listTenantAccess(userId);
  const decisao = escolherAcesso(acessos, lerCookie(cookieHeader, TENANT_COOKIE));

  if (decisao.ok) return decisao.acesso;

  if (decisao.motivo === "sem_acesso") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sua conta não tem acesso a nenhuma empresa. Peça ao responsável para liberar.",
    });
  }
  throw new TRPCError({ code: "PRECONDITION_FAILED", message: PRECISA_ESCOLHER_EMPRESA });
}

/**
 * Procedure de qualquer rota que leia ou escreva dados de uma empresa.
 *
 * Expõe `ctx.ownerId` — a empresa em operação — e `ctx.nivel`. A partir daqui, nenhuma rota deve
 * usar `ctx.user.id` para escopo de dados: o usuário logado e a empresa dos dados são coisas
 * diferentes, e confundi-las é exatamente o que vazaria dado entre clientes.
 */
export const empresaProcedure = protectedProcedure.use(async (opts) => {
  const acesso = await resolverEmpresa(opts.ctx.user.id, opts.ctx.req.headers.cookie);
  return opts.next({
    ctx: { ...opts.ctx, ownerId: acesso.tenantOwnerId, nivel: acesso.nivel as NivelAcesso },
  });
});

/** Rotas que alteram dados: fechadas para quem só consulta. */
export const escritaProcedure = empresaProcedure.use(async (opts) => {
  if (opts.ctx.nivel === "consulta") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seu acesso nesta empresa é somente de consulta.",
    });
  }
  return opts.next();
});

/**
 * Rotas de resultado financeiro — DRE, repasse ao proprietário, comissão, informes fiscais.
 * O nível operacional cadastra o dia a dia mas não enxerga quanto a empresa ganhou.
 */
export const financeiroProcedure = empresaProcedure.use(async (opts) => {
  if (opts.ctx.nivel !== "total") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seu acesso nesta empresa não inclui o resultado financeiro.",
    });
  }
  return opts.next();
});
