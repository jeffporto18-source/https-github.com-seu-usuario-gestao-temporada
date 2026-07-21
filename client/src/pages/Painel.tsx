import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { brl, competenciaAtual, competencias } from "@/lib/format";
import { PageHeader } from "./Clientes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Building2, CalendarDays, Coins, AlertTriangle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

/** Layout do painel por tipo de usuário — cada perfil vê estatísticas relevantes ao seu papel. */
const DASHBOARD_LAYOUT: Record<string, { showReservasMes: boolean; showReceitaIntermediada: boolean }> = {
  holding: { showReservasMes: false, showReceitaIntermediada: false },
};
const DEFAULT_LAYOUT = { showReservasMes: true, showReceitaIntermediada: true };

export default function Painel() {
  const { user } = useAuth();
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const { data, isLoading } = trpc.dashboard.overview.useQuery({ competencia });
  const meses = competencias();
  const layout = DASHBOARD_LAYOUT[user?.userType || ""] ?? DEFAULT_LAYOUT;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={`Bem-vindo, ${user?.name?.split(" ")[0] ?? "Administrador"}`}
        subtitle="Visão geral da sua carteira de imóveis e da operação do mês."
        action={
          <Select value={competencia} onValueChange={setCompetencia}>
            <SelectTrigger className="w-[160px] bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading || !data ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl border border-border bg-card animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className={`grid sm:grid-cols-2 gap-4 ${layout.showReservasMes ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            <Stat icon={Users} label="Clientes" value={String(data.totalClientes)} />
            <Stat icon={Building2} label="Imóveis gerenciados" value={String(data.totalImoveis)} />
            {layout.showReservasMes && <Stat icon={CalendarDays} label="Reservas no mês" value={String(data.totalReservasMes)} />}
            <Stat icon={Coins} label="Comissão do mês" value={brl(data.comissaoMes)} highlight />
          </div>

          <div className={`grid gap-4 mt-4 ${layout.showReceitaIntermediada ? "lg:grid-cols-2" : ""}`}>
            {layout.showReceitaIntermediada && (
              <Card className="p-6">
                <h3 className="font-serif font-semibold mb-1">Receita intermediada</h3>
                <p className="text-sm text-muted-foreground mb-4">Volume bruto de reservas em {competencia}.</p>
                <p className="font-serif text-3xl font-semibold tabular-nums">{brl(data.receitaMes)}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Comissão da administradora: <span className="text-primary font-medium">{brl(data.comissaoMes)}</span>
                </p>
              </Card>
            )}

            <Card className="p-6">
              <h3 className="font-serif font-semibold mb-1 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Certificados digitais A1
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Alertas de vencimento nos próximos 60 dias.</p>
              {data.alertasCertificado.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Nenhum certificado a vencer.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.alertasCertificado.map((a) => (
                    <div key={a.clienteId} className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${a.diasRestantes < 0 ? "bg-destructive/10" : "bg-amber-50"}`}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${a.diasRestantes < 0 ? "text-destructive" : "text-amber-600"}`} />
                        <span className="text-sm font-medium">{a.nome}</span>
                      </div>
                      <span className={`text-xs font-medium ${a.diasRestantes < 0 ? "text-destructive" : "text-amber-700"}`}>
                        {a.diasRestantes < 0 ? `Vencido há ${Math.abs(a.diasRestantes)}d` : `Vence em ${a.diasRestantes}d`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, highlight }: { icon: React.ElementType; label: string; value: string; highlight?: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${highlight ? "bg-primary/10" : "bg-secondary"}`}>
          <Icon className={`h-5 w-5 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-3">{label}</p>
      <p className={`font-serif text-2xl font-semibold tabular-nums mt-0.5 ${highlight ? "text-primary" : ""}`}>{value}</p>
    </Card>
  );
}
