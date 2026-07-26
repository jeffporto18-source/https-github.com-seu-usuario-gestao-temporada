import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { brl, competenciaAtual } from "@/lib/format";
import { PageHeader, EmptyState } from "./Clientes";
import { UnitPeriodFilter } from "@/components/UnitPeriodFilter";
import { Wallet, FileText } from "lucide-react";

export default function Repasse() {
  const { data: imoveis } = trpc.properties.list.useQuery();
  const [propertyId, setPropertyId] = useState<string>("");
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());

  const enabled = !!propertyId;
  const { data: dre, isLoading } = trpc.dre.porUnidade.useQuery(
    { propertyId: Number(propertyId), competencia },
    { enabled },
  );
  const { data: reservas } = trpc.reservations.list.useQuery(
    { propertyId: Number(propertyId), competencia },
    { enabled },
  );
  const { data: notas } = trpc.reservations.invoicesByProperty.useQuery(
    { propertyId: Number(propertyId), competencia },
    { enabled },
  );
  const notasLocacao = (notas ?? []).filter((n) => n.tipo === "locacao").length;
  const notasComissao = (notas ?? []).filter((n) => n.tipo === "comissao").length;

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Repasse ao Proprietário"
        subtitle="Extrato mensal do valor a transferir ao dono da unidade (Owner Statement)."
      />

      <UnitPeriodFilter
        properties={imoveis}
        propertyId={propertyId}
        setPropertyId={setPropertyId}
        competencia={competencia}
        setCompetencia={setCompetencia}
      />

      {!enabled ? (
        <EmptyState title="Selecione um imóvel" subtitle="Escolha a unidade e a competência para gerar o extrato." />
      ) : isLoading ? (
        <div className="h-80 rounded-xl border border-border bg-card animate-pulse" />
      ) : !dre ? (
        <EmptyState title="Sem dados no período" />
      ) : (
        <Card className="overflow-hidden">
          <div className="bg-primary text-primary-foreground p-6">
            <p className="text-sm opacity-80">Extrato de repasse — {competencia}</p>
            <h2 className="font-serif text-2xl font-semibold mt-1">{dre.cliente?.nome}</h2>
            <p className="text-sm opacity-90">{dre.propriedade.apelido}</p>
          </div>

          <div className="p-6 space-y-5">
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Reservas do período</p>
              {reservas?.length ? (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {reservas.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span>{r.codigo} · {r.noites} noites</span>
                      <span className="tabular-nums">{brl(Number(r.valorBruto) + Number(r.taxaLimpeza))}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma reserva.</p>
              )}
            </section>

            <section className="space-y-1.5 text-sm">
              <Row label="Receita bruta" value={brl(dre.receitaBruta)} />
              <Row label="(−) Taxa Airbnb" value={`− ${brl(dre.taxaAirbnb)}`} muted />
              <Row label="(−) Comissão da administradora" value={`− ${brl(dre.comissao)}`} muted />
              <Row label="(−) Despesas operacionais" value={`− ${brl(dre.totalDespesas)}`} muted />
            </section>

            <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
              <span className="flex items-center gap-2 font-medium">
                <Wallet className="h-4 w-4 text-primary" /> Valor a transferir
              </span>
              <span className="tabular-nums font-serif text-2xl font-semibold text-primary">
                {brl(dre.resultadoProprietario)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              {notasLocacao + notasComissao} nota(s) fiscal(is) emitida(s) no período ({notasLocacao} locação + {notasComissao} comissão)
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
