import { useState } from "react";
import { Building2, Landmark, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NIVEIS_ACESSO, NIVEL_ACESSO_INFO, type NivelAcesso } from "@shared/niveis";
import { PageHeader, EmptyState, SkeletonList } from "./Clientes";

/**
 * Painel do escritório contábil: quem da sua equipe atende cada empresa cliente, e com que alcance.
 *
 * Conceder acesso aqui abre os dados de um cliente para alguém de fora dele — por isso nada é
 * concedido automaticamente e cada linha mostra explicitamente quem enxerga o quê.
 */
export default function Escritorio() {
  const utils = trpc.useUtils();
  const { data: empresas, isLoading } = trpc.escritorio.empresas.useQuery();
  const { data: pessoas } = trpc.escritorio.pessoas.useQuery();

  const [pessoaSelecionada, setPessoaSelecionada] = useState<string>("");
  const [nivelSelecionado, setNivelSelecionado] = useState<NivelAcesso>("total");

  const conceder = trpc.escritorio.conceder.useMutation({
    onSuccess: () => {
      utils.escritorio.empresas.invalidate();
      utils.empresas.minhas.invalidate();
      toast.success("Acesso concedido.");
    },
    onError: (e) => toast.error(e.message),
  });

  const revogar = trpc.escritorio.revogar.useMutation({
    onSuccess: () => {
      utils.escritorio.empresas.invalidate();
      utils.empresas.minhas.invalidate();
      toast.success("Acesso removido.");
    },
    onError: (e) => toast.error(e.message),
  });

  const nomePessoa = (id: number) => pessoas?.find((p) => p.id === id)?.nome ?? `Usuário ${id}`;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Escritório"
        subtitle="Quem da sua equipe atende cada empresa cliente, e com que alcance. Os clientes continuam sem enxergar nada uns dos outros."
      />

      <Card className="mb-5 p-4">
        <p className="text-sm font-medium">Liberar acesso para a sua equipe</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Você já enxerga todas as empresas abaixo — é o escritório. Aqui você libera o acesso dos seus
          funcionários, empresa por empresa, porque nem todos precisam atender a carteira inteira.
        </p>
        {pessoas?.length === 0 && (
          <p className="mt-2 rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            Você ainda não cadastrou ninguém na equipe. Cadastre em <strong>Usuários</strong> e essas pessoas
            aparecerão aqui.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <label className="text-[11px] text-muted-foreground">Pessoa</label>
            <Select value={pessoaSelecionada} onValueChange={setPessoaSelecionada}>
              <SelectTrigger className="h-9 w-[240px]">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {(pessoas ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nome} {p.ehVoce ? "(você)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-[11px] text-muted-foreground">Nível</label>
            <Select value={nivelSelecionado} onValueChange={(v) => setNivelSelecionado(v as NivelAcesso)}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NIVEIS_ACESSO.map((n) => (
                  <SelectItem key={n} value={n}>{NIVEL_ACESSO_INFO[n].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{NIVEL_ACESSO_INFO[nivelSelecionado].descricao}</p>
      </Card>

      {isLoading ? (
        <SkeletonList />
      ) : !empresas?.length ? (
        <EmptyState title="Nenhuma empresa cadastrada" />
      ) : (
        <div className="space-y-3">
          {empresas.map((e) => (
            <Card key={e.id} className="overflow-hidden py-0">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/40 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  {e.userType === "holding" ? (
                    <Landmark className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  disabled={!pessoaSelecionada || conceder.isPending}
                  // Um botão que não clica precisa dizer por quê; sem isto ele fica mudo e a tela
                  // parece quebrada.
                  title={pessoaSelecionada ? "Liberar esta empresa para a pessoa selecionada" : "Escolha antes uma pessoa da equipe, no topo da tela"}
                  onClick={() =>
                    conceder.mutate({ userId: Number(pessoaSelecionada), empresaId: e.id, nivel: nivelSelecionado })
                  }
                >
                  Liberar
                </Button>
              </div>

              <ul className="divide-y divide-border">
                {e.acessos.map((a) => (
                  <li key={a.userId} className="flex items-center gap-3 px-4 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {a.nome || a.email || nomePessoa(a.userId)}
                        {a.ehDonoDaEmpresa && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                            <ShieldCheck className="h-3 w-3" /> dono
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{NIVEL_ACESSO_INFO[a.nivel as NivelAcesso]?.label ?? a.nivel}</p>
                    </div>
                    {!a.ehDonoDaEmpresa && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => revogar.mutate({ userId: a.userId, empresaId: e.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
