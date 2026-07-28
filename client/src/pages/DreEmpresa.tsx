import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { brl, competenciaAtual, competencias } from "@/lib/format";
import { PageHeader, EmptyState } from "./Clientes";
import { TrendingDown, TrendingUp } from "lucide-react";

export default function DreEmpresa() {
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const { data: dre, isLoading } = trpc.dre.empresa.useQuery({ competencia });
  const meses = competencias();

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="DRE Empresa"
        subtitle="Demonstrativo de resultado consolidado de todos os imóveis, organizado pelo plano de contas."
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={competencia} onValueChange={setCompetencia}>
          <SelectTrigger className="w-[160px] bg-card">
            <SelectValue placeholder="Competência" />
          </SelectTrigger>
          <SelectContent>
            {meses.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : !dre ? (
        <EmptyState title="Sem dados no período" />
      ) : (
        <Card className="p-6">
          <div className="space-y-1">
            <SectionLabel>Receitas</SectionLabel>
            {dre.receitas.contas.length === 0 ? (
              <Line label="Nenhuma receita lançada" value={brl(0)} sub small />
            ) : (
              dre.receitas.contas.map((c) => (
                <Line key={c.nome} label={c.nome} value={`+ ${brl(c.total)}`} sub small positive />
              ))
            )}
            <Line label="(=) Total de receitas" value={brl(dre.totalReceitas)} bold positive />

            <Divider />

            <SectionLabel>Despesas fixas</SectionLabel>
            {dre.despesasFixas.contas.length === 0 ? (
              <Line label="Nenhuma despesa fixa lançada" value={brl(0)} sub small />
            ) : (
              dre.despesasFixas.contas.map((c) => (
                <Line key={c.nome} label={c.nome} value={`− ${brl(c.total)}`} sub small />
              ))
            )}
            <Line label="(−) Total de despesas fixas" value={`− ${brl(dre.totalDespesasFixas)}`} sub />

            <SectionLabel>Despesas variáveis</SectionLabel>
            {dre.despesasVariaveis.contas.length === 0 ? (
              <Line label="Nenhuma despesa variável lançada" value={brl(0)} sub small />
            ) : (
              dre.despesasVariaveis.contas.map((c) => (
                <Line key={c.nome} label={c.nome} value={`− ${brl(c.total)}`} sub small />
              ))
            )}
            <Line label="(−) Total de despesas variáveis" value={`− ${brl(dre.totalDespesasVariaveis)}`} sub />

            <Divider />

            <div className={`flex items-center justify-between rounded-lg px-4 py-4 ${dre.resultado >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
              <span className="flex items-center gap-2 font-medium">
                {dre.resultado >= 0 ? <TrendingUp className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                Resultado consolidado da empresa
              </span>
              <span className={`tabular-nums font-serif text-xl font-semibold ${dre.resultado >= 0 ? "text-primary" : "text-destructive"}`}>
                {brl(dre.resultado)}
              </span>
            </div>

            {dre.totalAportes > 0 && (
              <>
                <SectionLabel>Aportes de capital</SectionLabel>
                {dre.aportes.contas.map((c) => (
                  <Line key={c.nome} label={c.nome} value={`+ ${brl(c.total)}`} sub small />
                ))}
                <p className="text-xs text-muted-foreground pt-2">
                  Total de aportes no período: <span className="font-medium">{brl(dre.totalAportes)}</span> (informativo, não incluído no resultado acima).
                </p>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function Line({ label, value, bold, sub, small, positive }: { label: string; value: string; bold?: boolean; sub?: boolean; small?: boolean; positive?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${small ? "pl-4" : ""}`}>
      <span className={`${sub ? "text-muted-foreground" : ""} ${small ? "text-sm" : ""}`}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold" : ""} ${positive ? "text-primary" : ""} ${small ? "text-sm" : ""}`}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border my-2" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground pt-3 pb-1">{children}</p>;
}
