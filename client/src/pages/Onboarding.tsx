import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { UserType, USER_TYPES } from "@/lib/userTypes";

export default function Onboarding() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [userType, setUserType] = useState<UserType | null>(null);

  const utils = trpc.useUtils();
  const save = trpc.onboarding.save.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Perfil salvo com sucesso!");
      // Redireciona para o painel principal
      window.location.href = "/painel";
    },
    onError: (e) => toast.error(e.message),
  });

  // Se ainda carregando, mostra skeleton
  if (loading) return <DashboardLayoutSkeleton />;

  // Se não está autenticado, redireciona para cadastro
  if (!isAuthenticated) return <Redirect to="/" />;

  // Se já completou onboarding, redireciona para painel
  if (user?.userType) return <Redirect to="/painel" />;

  const handleSave = () => {
    if (userType) {
      save.mutate({ userType });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground tracking-tight">
            Bem-vindo ao Temporada<span className="text-primary">.</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Olá, <span className="font-medium text-foreground">{user?.name || "usuário"}</span>! Para começar, escolha seu perfil de atuação.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            A classificação fiscal (PJ, PF com CBS/IBS ou PF isento) será definida individualmente para cada proprietário cadastrado.
          </p>
        </div>

        {/* Tipo de Usuário */}
        <div className="grid gap-3">
          {USER_TYPES.map((t) => {
            const Icon = t.icon;
            const selected = userType === t.value;
            return (
              <Card
                key={t.value}
                className={`p-5 cursor-pointer border-2 transition-all duration-200 hover:border-primary/50 ${
                  selected ? "border-primary bg-primary/5 shadow-md" : "border-border"
                }`}
                onClick={() => setUserType(t.value)}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-end mt-8">
          <Button
            onClick={handleSave}
            disabled={!userType || save.isPending}
            className="min-w-[140px] active:scale-[0.97] transition-transform"
          >
            {save.isPending ? "Salvando..." : "Começar a usar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
