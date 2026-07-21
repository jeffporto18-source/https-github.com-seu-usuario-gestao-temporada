import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Building2, BarChart3, FileText, Receipt } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao fazer login.");
        return;
      }
      toast.success("Login realizado com sucesso!");
      // Redireciona para / que vai resolver para painel ou onboarding
      window.location.href = "/painel";
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: Building2, text: "Gestão de imóveis e proprietários" },
    { icon: Receipt, text: "Controle de despesas por unidade" },
    { icon: FileText, text: "Emissão de NFS-e automatizada" },
    { icon: BarChart3, text: "DRE e repasse ao proprietário" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Lado esquerdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20 bg-card border-r border-border">
        <div className="max-w-md">
          <h1 className="font-serif text-4xl font-semibold tracking-tight mb-4">
            Temporada<span className="text-primary">.</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            A plataforma completa para gestão fiscal e financeira do seu aluguel por temporada.
          </p>
          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <span className="text-sm text-foreground">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="text-center">
            <div className="lg:hidden mb-4">
              <span className="font-serif text-2xl font-semibold tracking-tight">
                Temporada<span className="text-primary">.</span>
              </span>
            </div>
            <CardTitle className="text-2xl font-serif">Entrar</CardTitle>
            <CardDescription>Acesse sua conta para gerenciar seus imóveis</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full active:scale-[0.97] transition-transform" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                Entrar
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <button
                type="button"
                onClick={() => setLocation("/")}
                className="text-primary underline hover:text-primary/80"
              >
                Criar conta
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
