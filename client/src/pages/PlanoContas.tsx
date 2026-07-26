import { trpc, type RouterOutputs } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, MoreHorizontal, Receipt, CalendarClock, Sparkles, CornerDownRight } from "lucide-react";
import { PageHeader } from "./Clientes";

type Grupo = "despesa_fixa" | "despesa_variavel" | "investimento";
type ChartAccount = RouterOutputs["chartAccounts"]["list"][number];

const GRUPOS: { value: Grupo; label: string; icon: typeof Receipt }[] = [
  { value: "despesa_fixa", label: "Despesas Fixas", icon: CalendarClock },
  { value: "despesa_variavel", label: "Despesas Variáveis", icon: Receipt },
  { value: "investimento", label: "Investimento", icon: Sparkles },
];

export default function PlanoContas() {
  const utils = trpc.useUtils();
  const { data: contas, isLoading } = trpc.chartAccounts.list.useQuery({});

  const [dialog, setDialog] = useState<{ grupo: Grupo; parentId: number | null; editId: number | null; nome: string } | null>(null);

  const create = trpc.chartAccounts.create.useMutation({
    onSuccess: () => { utils.chartAccounts.list.invalidate(); setDialog(null); toast.success("Conta criada."); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.chartAccounts.update.useMutation({
    onSuccess: () => { utils.chartAccounts.list.invalidate(); setDialog(null); toast.success("Conta atualizada."); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.chartAccounts.delete.useMutation({
    onSuccess: () => { utils.chartAccounts.list.invalidate(); toast.success("Conta removida."); },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    if (!dialog?.nome.trim()) { toast.error("Informe o nome da conta."); return; }
    if (dialog.editId) {
      update.mutate({ id: dialog.editId, nome: dialog.nome.trim() });
    } else {
      create.mutate({ grupo: dialog.grupo, nome: dialog.nome.trim(), parentId: dialog.parentId ?? undefined });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Plano de Contas"
        subtitle="Contas e sub-contas usadas nos lançamentos, organizadas por grupo. Alimenta a DRE."
      />

      {isLoading ? (
        <div className="grid lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 rounded-xl border border-border bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          {GRUPOS.map((g) => (
            <GroupColumn
              key={g.value}
              grupo={g.value}
              label={g.label}
              Icon={g.icon}
              contas={(contas ?? []).filter((c) => c.grupo === g.value)}
              onNovaConta={() => setDialog({ grupo: g.value, parentId: null, editId: null, nome: "" })}
              onNovaSubConta={(parentId) => setDialog({ grupo: g.value, parentId, editId: null, nome: "" })}
              onEditar={(c) => setDialog({ grupo: g.value, parentId: c.parentId, editId: c.id, nome: c.nome })}
              onExcluir={(id) => del.mutate({ id })}
            />
          ))}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {dialog?.editId ? "Editar conta" : dialog?.parentId ? "Nova sub-conta" : "Nova conta"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label>Nome</Label>
            <Input
              autoFocus
              value={dialog?.nome ?? ""}
              onChange={(e) => setDialog((d) => (d ? { ...d, nome: e.target.value } : d))}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-background" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={submit} disabled={create.isPending || update.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupColumn({
  grupo,
  label,
  Icon,
  contas,
  onNovaConta,
  onNovaSubConta,
  onEditar,
  onExcluir,
}: {
  grupo: Grupo;
  label: string;
  Icon: typeof Receipt;
  contas: ChartAccount[];
  onNovaConta: () => void;
  onNovaSubConta: (parentId: number) => void;
  onEditar: (c: ChartAccount) => void;
  onExcluir: (id: number) => void;
}) {
  const principais = contas.filter((c) => !c.parentId);
  const subContasDe = (id: number) => contas.filter((c) => c.parentId === id);

  return (
    <Card className="overflow-hidden py-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-serif font-semibold text-sm">{label}</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNovaConta} title="Nova conta">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {principais.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">Nenhuma conta cadastrada.</p>
      ) : (
        <div className="divide-y divide-border">
          {principais.map((c) => (
            <div key={c.id}>
              <AccountRow c={c} onNovaSubConta={() => onNovaSubConta(c.id)} onEditar={() => onEditar(c)} onExcluir={() => onExcluir(c.id)} />
              {subContasDe(c.id).map((sub) => (
                <div key={sub.id} className="pl-6 border-t border-border/60">
                  <AccountRow c={sub} sub onEditar={() => onEditar(sub)} onExcluir={() => onExcluir(sub.id)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AccountRow({
  c,
  sub,
  onNovaSubConta,
  onEditar,
  onExcluir,
}: {
  c: ChartAccount;
  sub?: boolean;
  onNovaSubConta?: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 px-4 py-2 hover:bg-secondary/40 transition-colors">
      {sub && <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      <span className={`flex-1 truncate ${sub ? "text-sm text-muted-foreground" : "text-sm font-medium"}`}>{c.nome}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity shrink-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onNovaSubConta && (
            <DropdownMenuItem onClick={onNovaSubConta}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Nova sub-conta
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onEditar}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onExcluir}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
