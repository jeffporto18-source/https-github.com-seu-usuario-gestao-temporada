import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  Building2,
  FileText,
  BarChart3,
  ShieldCheck,
  Receipt,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirecionar usuário logado: se não completou onboarding, vai para onboarding; se completou, vai para painel
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (!user?.userType) {
        setLocation("/onboarding");
      } else {
        setLocation("/painel");
      }
    }
  }, [loading, isAuthenticated, user, setLocation]);

  const entrar = () => {
    setLocation("/login");
  };

  const features = [
    { icon: Building2, title: "Clientes e Imóveis", desc: "Cadastre proprietários PF e PJ e vincule cada unidade gerenciada com dados fiscais completos." },
    { icon: Receipt, title: "Despesas e Investimentos", desc: "Controle luz, gás, IPTU, condomínio, faxineira, enxoval e acessórios por unidade." },
    { icon: FileText, title: "Emissão de NFS-e", desc: "Motor de dupla operação: nota de locação (99.03.01) e de comissão, prontas para o padrão nacional." },
    { icon: BarChart3, title: "DRE por Unidade", desc: "Resultado mensal consolidado com receitas, taxas, comissão e repasse ao proprietário." },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-40 bg-background/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-serif text-xl font-semibold tracking-tight">
            Temporada<span className="text-primary">.</span>
          </span>
          <Button onClick={entrar} className="active:scale-[0.97] transition-transform">
            {isAuthenticated ? "Acessar painel" : "Entrar"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, oklch(0.9 0.05 165 / 0.5), transparent 45%), radial-gradient(circle at 80% 10%, oklch(0.92 0.06 85 / 0.45), transparent 40%)",
          }}
        />
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Pronto para a reforma tributária de 2026
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
              Gestão fiscal e financeira do seu aluguel por temporada
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              A plataforma completa para administradoras de imóveis: cadastro de proprietários,
              controle de despesas por unidade, emissão de notas fiscais e DRE mensal — tudo em um só lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={entrar} className="active:scale-[0.97] transition-transform">
                Começar agora
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Suporte a certificado digital A1
              </div>
            </div>
          </div>
          <div className="md:col-span-5">
            <div className="rounded-2xl border border-border bg-card shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">DRE — Studio Beira-Mar</span>
                <span className="font-medium">06/2026</span>
              </div>
              <div className="space-y-2 text-sm">
                <Row label="Receita bruta de locação" value="R$ 5.730,00" />
                <Row label="Taxa Airbnb (4%)" value="− R$ 229,20" muted />
                <Row label="Comissão (20%)" value="− R$ 1.146,00" muted />
                <Row label="Despesas operacionais" value="− R$ 945,00" muted />
                <div className="h-px bg-border my-2" />
                <Row label="Resultado do proprietário" value="R$ 3.409,80" bold />
              </div>
              <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
                2 NFS-e emitidas por reserva: locação + comissão
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 hover:shadow-lg transition-shadow"
            >
              <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="max-w-6xl mx-auto px-6 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span className="font-serif font-semibold">Temporada<span className="text-primary">.</span></span>
          <span>Protótipo — emissão fiscal em modo simulado, arquitetada para provedor real.</span>
        </div>
      </footer>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold text-primary" : ""}`}>{value}</span>
    </div>
  );
}
