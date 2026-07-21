/**
 * Motor fiscal do SaaS de gestão de aluguel de temporada.
 * -------------------------------------------------------------
 * Implementa a "dupla operação":
 *   - Locação (receita do PROPRIETÁRIO)   -> NFS-e código 99.03.01
 *   - Comissão de administração (ADMINISTRADORA) -> NFS-e serviço
 *
 * Regras fixadas (fase de teste 2026):
 *   - Redutor de base de cálculo CBS/IBS: 40%
 *   - Alíquotas simbólicas de teste: CBS 0,9% | IBS 0,1%
 *   - Taxa de plataforma Airbnb (anfitrião): 4% (parametrizável por reserva)
 *
 * Toda a matemática usa centavos inteiros para evitar erro de ponto flutuante.
 */

// Código nacional de serviço de locação de bens imóveis
export const COD_LOCACAO = "99.03.01";
// Código de serviço de intermediação/administração (ilustrativo, configurável)
export const COD_INTERMEDIACAO = "17.05";

// Redutor de base de cálculo aplicável à locação por temporada (hotelaria)
export const REDUTOR_BASE_TEMPORADA = 0.4;
// Alíquotas de teste 2026
export const CBS_TESTE = 0.009; // 0,9%
export const IBS_TESTE = 0.001; // 0,1%

export type FiscalCategoryType = "pj" | "pf_cbs_ibs" | "pf_isento";

export type OperacaoInput = {
  reservaCodigo: string;
  propriedadeApelido: string;
  checkin: string; // "AAAA-MM-DD"
  checkout: string;
  noites: number;
  valorBruto: number; // diárias
  taxaLimpeza: number;
  taxaAirbnbPct: number; // ex.: 4
  comissaoPct: number; // ex.: 20
  // dados fiscais
  admin: { cnpj: string; razaoSocial: string };
  proprietario: { nome: string; cpfCnpj: string; tipo: "PF" | "PJ" };
  /** Categoria fiscal do usuário que determina o comportamento tributário */
  fiscalCategory?: FiscalCategoryType;
};

export type ResultadoFiscal = {
  receitaLocacao: number;
  taxaAirbnb: number;
  comissaoAdmin: number;
  baseTributavelLocacao: number;
  cbsLocacao: number;
  ibsLocacao: number;
  liquidoProprietario: number;
  notaComissao: Record<string, unknown>;
  notaLocacao: Record<string, unknown>;
  /** Se false, PF isento não gera nota de locação */
  gerarNotaLocacao: boolean;
};

/** Arredonda para 2 casas com meio-para-cima, retornando número. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function processarOperacao(input: OperacaoInput): ResultadoFiscal {
  const receitaLocacao = round2(input.valorBruto + input.taxaLimpeza);
  const taxaAirbnb = round2(receitaLocacao * (input.taxaAirbnbPct / 100));
  const comissaoAdmin = round2(receitaLocacao * (input.comissaoPct / 100));

  const fiscalCat = input.fiscalCategory ?? "pj";

  // PF isento: não incide CBS/IBS
  // PF com CBS/IBS: aplica redutor de 40% + alíquotas de teste
  // PJ: aplica redutor de 40% + alíquotas de teste (mesmo comportamento que PF com CBS/IBS)
  let baseTributavel = 0;
  let cbs = 0;
  let ibs = 0;

  if (fiscalCat !== "pf_isento") {
    baseTributavel = round2(receitaLocacao * (1 - REDUTOR_BASE_TEMPORADA));
    cbs = round2(baseTributavel * CBS_TESTE);
    ibs = round2(baseTributavel * IBS_TESTE);
  }

  const liquidoProprietario = round2(receitaLocacao - taxaAirbnb - comissaoAdmin);

  const notaComissao = {
    prestador: { cnpj: input.admin.cnpj, razaoSocial: input.admin.razaoSocial },
    tomador: { cpfCnpj: input.proprietario.cpfCnpj, nome: input.proprietario.nome, tipo: input.proprietario.tipo },
    servico: {
      codigoTributacaoNacional: COD_INTERMEDIACAO,
      discriminacao: `Comissao de administracao (${input.comissaoPct}%) - Unidade ${input.propriedadeApelido} - Reserva ${input.reservaCodigo} (${input.checkin} a ${input.checkout})`,
      valorServicos: comissaoAdmin,
    },
  };

  const notaLocacao: Record<string, unknown> = {
    prestador: { cpfCnpj: input.proprietario.cpfCnpj, nome: input.proprietario.nome, tipo: input.proprietario.tipo },
    tomador: { nome: "Consumidor final (hospede)" },
    servico: {
      codigoTributacaoNacional: COD_LOCACAO,
      discriminacao: `Locacao por temporada - Unidade ${input.propriedadeApelido} - ${input.noites} noites - Reserva ${input.reservaCodigo}`,
      valorServicos: receitaLocacao,
      ...(fiscalCat !== "pf_isento"
        ? {
            tributos: {
              redutorBasePct: REDUTOR_BASE_TEMPORADA * 100,
              baseCalculoReduzida: baseTributavel,
              cbs,
              ibs,
            },
          }
        : { tributos: null, observacao: "PF isento - sem incid\u00eancia de CBS/IBS" }),
    },
  };

  // PF isento: não gera nota de locação (apenas a nota de comissão da administradora)
  const gerarNotaLocacao = fiscalCat !== "pf_isento";

  return {
    receitaLocacao,
    taxaAirbnb,
    comissaoAdmin,
    baseTributavelLocacao: baseTributavel,
    cbsLocacao: cbs,
    ibsLocacao: ibs,
    liquidoProprietario,
    notaComissao,
    notaLocacao,
    gerarNotaLocacao,
  };
}

/**
 * Cliente da API do provedor fiscal (fachada).
 * Único ponto que tocaria o mundo externo. Em modo simulado, devolve uma
 * resposta idêntica em formato à de Nuvem Fiscal / Focus NFe. Para tornar real,
 * basta trocar o corpo por uma chamada fetch/axios ao provedor — a assinatura
 * NÃO muda, então nenhum outro arquivo precisa ser refatorado.
 */
export const MODO_SIMULADO = true;

export type RespostaNfse = {
  status: "autorizada" | "cancelada" | "erro";
  chaveAcesso: string;
  numeroNfse: string;
  dataEmissao: string;
  urlDanfsePdf: string;
  urlXml: string;
};

function gerarChaveAcesso(payload: Record<string, unknown>): string {
  const base = JSON.stringify(payload) + Math.random().toString();
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  const seed = hash.toString(16).toUpperCase().padStart(8, "0");
  return (seed + seed + seed + seed + seed + seed + seed).slice(0, 50);
}

export async function emitirNfse(payload: Record<string, unknown>): Promise<RespostaNfse> {
  if (MODO_SIMULADO) {
    const chave = gerarChaveAcesso(payload);
    return {
      status: "autorizada",
      chaveAcesso: chave,
      numeroNfse: String(Math.floor(Math.random() * 99999) + 1),
      dataEmissao: new Date().toISOString(),
      urlDanfsePdf: `https://provedor.exemplo/danfse/${chave}.pdf`,
      urlXml: `https://provedor.exemplo/xml/${chave}.xml`,
    };
  }

  // ---- MODO REAL (habilitar quando houver certificado A1 e token) ----
  // const resp = await fetch(process.env.NFSE_PROVIDER_URL!, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${process.env.NFSE_PROVIDER_TOKEN}`,
  //   },
  //   body: JSON.stringify(payload),
  // });
  // if (!resp.ok) throw new Error(`Provedor fiscal retornou ${resp.status}`);
  // return (await resp.json()) as RespostaNfse;
  throw new Error("Modo real não configurado");
}
