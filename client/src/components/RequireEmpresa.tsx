import { Building2, Landmark, Check } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

/** Mesma mensagem que o servidor devolve quando o usuário atende mais de uma empresa. */
const PRECISA_ESCOLHER = "PRECISA_ESCOLHER_EMPRESA";

const NIVEL_ROTULO: Record<string, string> = {
  total: "Acesso total",
  operacional: "Operacional",
  consulta: "Somente consulta",
};

/** Tela de escolha, mostrada a quem atende mais de uma empresa. */
function SelecionarEmpresa() {
  const utils = trpc.useUtils();
  const { data: empresas, isLoading } = trpc.empresas.minhas.useQuery();

  const selecionar = trpc.empresas.selecionar.useMutation({
    onSuccess: () => {
      // Tudo que estava em cache pertence à empresa anterior.
      utils.invalidate();
      window.location.reload();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <DashboardLayoutSkeleton />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl font-semibold">Qual empresa você quer abrir?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Você atende mais de uma. Os dados de cada uma são separados — nada aparece misturado.
          </p>
        </div>

        <Card className="divide-y divide-border p-0 overflow-hidden">
          {(empresas ?? []).map((e) => (
            <button
              key={e.id}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 disabled:opacity-60"
              disabled={selecionar.isPending}
              onClick={() => selecionar.mutate({ empresaId: e.id })}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                {e.userType === "holding" ? (
                  <Landmark className="h-4 w-4 text-primary" />
                ) : (
                  <Building2 className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.nome}</p>
                <p className="text-xs text-muted-foreground">{NIVEL_ROTULO[e.nivel] ?? e.nivel}</p>
              </div>
            </button>
          ))}
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Você pode trocar de empresa a qualquer momento, pelo seletor no topo das telas.
        </p>
      </div>
    </div>
  );
}

/** Mensagem para quem está autenticado mas não foi ligado a nenhuma empresa. */
function SemEmpresa({ mensagem }: { mensagem: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md p-6 text-center">
        <h1 className="font-serif text-lg font-semibold">Acesso não liberado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mensagem}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            window.location.href = "/login";
          }}
        >
          Entrar com outra conta
        </Button>
      </Card>
    </div>
  );
}

/**
 * Garante que existe uma empresa em operação antes de renderizar qualquer tela de dados.
 *
 * Quem atende uma empresa só entra direto, como sempre. Quem atende várias escolhe aqui — e a
 * escolha é apenas uma indicação: o servidor revalida o acesso a cada requisição.
 */
export default function RequireEmpresa({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = trpc.empresas.atual.useQuery(undefined, { retry: false });

  if (isLoading) return <DashboardLayoutSkeleton />;

  if (error) {
    if (error.message === PRECISA_ESCOLHER) return <SelecionarEmpresa />;
    return <SemEmpresa mensagem={error.message} />;
  }

  if (!data) return <DashboardLayoutSkeleton />;

  return <>{children}</>;
}

export { NIVEL_ROTULO };
