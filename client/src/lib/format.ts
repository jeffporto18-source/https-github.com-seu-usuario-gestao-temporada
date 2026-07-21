/** Formatação padrão brasileira para moeda e números. */
export function brl(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function num(v: number | string | null | undefined): number {
  return Number(v ?? 0);
}

/** Competência atual "AAAA-MM". */
export function competenciaAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Lista de competências (últimos N meses + próximos 2), formato AAAA-MM. */
export function competencias(qtd = 18): { value: string; label: string }[] {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const out: { value: string; label: string }[] = [];
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + 2); // começar 2 meses à frente
  for (let i = 0; i < qtd; i++) {
    const value = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value, label: `${meses[base.getMonth()]}/${base.getFullYear()}` });
    base.setMonth(base.getMonth() - 1);
  }
  return out;
}

export const EXPENSE_LABELS: Record<string, string> = {
  luz: "Luz",
  gas: "Gás",
  iptu: "IPTU",
  condominio: "Condomínio",
  faxineira: "Faxineira",
  material_limpeza: "Material de limpeza",
  kit_banheiro: "Kits de banheiro",
};

/** Formata uma data "AAAA-MM-DD" (string pura) para "DD/MM/AAAA" sem conversão de fuso horário. */
export function formatDate(v: string): string {
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}

/** Formata uma competência "AAAA-MM" para "mês/AAAA" (ex.: "2026-03" -> "mar/2026"). */
export function formatCompetencia(v: string): string {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [y, m] = v.split("-");
  return `${meses[Number(m) - 1]}/${y}`;
}

export function formatCpfCnpj(v: string): string {
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v;
}
