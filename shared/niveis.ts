/**
 * Níveis de acesso de um usuário dentro de uma empresa.
 *
 * Fica em `shared` porque servidor e telas precisam da mesma lista: o servidor decide o que cada
 * nível pode fazer, e as telas escondem o que não cabe. Duas listas separadas divergiriam.
 */
export const NIVEIS_ACESSO = ["total", "operacional", "consulta"] as const;

export type NivelAcesso = (typeof NIVEIS_ACESSO)[number];

export const NIVEL_ACESSO_INFO: Record<NivelAcesso, { label: string; descricao: string }> = {
  total: {
    label: "Total",
    descricao: "Enxerga e altera tudo, inclusive DRE, repasse ao proprietário e comissão.",
  },
  operacional: {
    label: "Operacional",
    descricao: "Cadastra e edita o dia a dia — imóveis, contratos, reservas, despesas — mas não vê o resultado financeiro.",
  },
  consulta: {
    label: "Consulta",
    descricao: "Apenas visualiza; não altera nada.",
  },
};
