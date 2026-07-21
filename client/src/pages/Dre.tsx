import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { brl, competenciaAtual } from "@/lib/format";
import { PageHeader, EmptyState } from "./Clientes";
import { UnitPeriodFilter } from "@/components/UnitPeriodFilter";
import { TrendingDown, TrendingUp } from "lucide-react";

export default function Dre() {
  const { data: imoveis } = trpc.properties.list.useQuery();
  const [propertyId, setPropertyId] = useState<string>("");
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());

  const enabled = !!propertyId;
  const { data: dre, isLoading } = trpc.dre.porUnidade.useQuery(
    { propertyId: Number(propertyId), competencia },
    { enabled },
  );

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="DRE por Unidade"
        subtitle="Demonstrativo de resultado mensal consolidado de cada imóvel."
      />

      <UnitPeriodFilter
        properties={imoveis}
        propertyId={propertyId}
        setPropertyId={setPropertyId}
        competencia={competencia}
        setCompetencia={setCompetencia}
      />

      {!enabled ? (
        <EmptyState title="Selecione um imóvel" subtitle="Escolha a unidade e a competência para ver a DRE." />
      ) : isLoading ? (
        <div className="h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : !dre ? (
        <EmptyState title="Sem dados no período" />
      ) : (
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif text-xl font-semibold">{dre.propriedade.apelido}</h2>
                <p className="text-sm text-muted-foreground">
                  {dre.cliente?.nome} · {dre.totalReservas} reservas · comp. {competencia}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <Line label="Receita bruta de locação" value={brl(dre.receitaBruta)} bold positive />
              <Line label={`(−) Taxa Airbnb`} value={`− ${brl(dre.taxaAirbnb)}`} sub />
              <Line label={`(−) Comissão da administradora`} value={`− ${brl(dre.comissao)}`} sub />
              <Divider />
              <Line label="(=) Repasse bruto ao proprietário" value={brl(dre.repasseBruto)} bold />

              {dre.despesas.length > 0 && (
                <>
                  <SectionLabel>Despesas operacionais</SectionLabel>
                  {dre.despesas.map((e) => (
                    <Line key={e.id} label={e.categoria || "Despesa"} value={`− ${brl(e.valor)}`} sub small />
                  ))}
                </>
              )}
              <Line label="(−) Total de despesas" value={`− ${brl(dre.totalDespesas)}`} sub />

              {dre.investimentos.length > 0 && (
                <>
                  <SectionLabel>Investimentos</SectionLabel>
                  {dre.investimentos.map((i) => (
                    <Line key={i.id} label={i.categoria || "Investimento"} value={`− ${brl(i.valor)}`} sub small />
                  ))}
                </>
              )}
              <Line label="(−) Total de investimentos" value={`− ${brl(dre.totalInvestimentos)}`} sub />

              <Divider />
              <div className={`flex items-center justify-between rounded-lg px-4 py-4 ${dre.resultadoProprietario >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                <span className="flex items-center gap-2 font-medium">
                  {dre.resultadoProprietario >= 0 ? <TrendingUp className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                  Resultado líquido do proprietário
                </span>
                <span className={`tabular-nums font-serif text-xl font-semibold ${dre.resultadoProprietario >= 0 ? "text-primary" : "text-destructive"}`}>
                  {brl(dre.resultadoProprietario)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-serif font-semibold mb-3">Tributos sobre a locação (fase de teste 2026)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Base reduzida em 40% (redutor da locação por temporada). Alíquotas simbólicas de teste.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <Metric label="CBS (locação)" value={brl(dre.cbs)} />
              <Metric label="IBS (locação)" value={brl(dre.ibs)} />
              <Metric label="Total CBS + IBS" value={brl(dre.cbs + dre.ibs)} />
            </div>
          </Card>
        </div>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular-nums font-semibold mt-1">{value}</p>
    </div>
  );
}
