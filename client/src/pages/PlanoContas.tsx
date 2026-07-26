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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, MoreHorizontal, ChevronRight, ChevronDown } from "lucide-react";
import { PageHeader } from "./Clientes";

type Grupo = "despesa_fixa" | "despesa_variavel" | "receita" | "aporte_capital";
type ChartAccount = RouterOutputs["chartAccounts"]["list"][number];

const GRUPO_LABELS: Record<Grupo, string> = {
  despesa_fixa: "Despesa Fixa",
  despesa_variavel: "Despesa Variável",
  receita: "Receita",
  aporte_capital: "Aporte de Capital",
};

const MAX_DEPTH = 3; // 4 níveis: 0=conta principal, 1=conta, 2=subconta, 3=sub-subconta

export default function PlanoContas() {
  const utils = trpc.useUtils();
  const { data: contas, isLoading } = trpc.chartAccounts.list.useQuery({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [novaPrincipal, setNovaPrincipal] = useState<{ nome: string; grupo: Grupo } | null>(null);
  const [novaSub, setNovaSub] = useState<{ parentId: number; nome: string } | null>(null);
  const [editando, setEditando] = useState<{ id: number; nome: string } | null>(null);

  const create = trpc.chartAccounts.create.useMutation({
    onSuccess: () => { utils.chartAccounts.list.invalidate(); setNovaPrincipal(null); setNovaSub(null); toast.success("Conta criada."); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.chartAccounts.update.useMutation({
    onSuccess: () => { utils.chartAccounts.list.invalidate(); setEditando(null); toast.success("Conta atualizada."); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.chartAccounts.delete.useMutation({
    onSuccess: () => { utils.chartAccounts.list.invalidate(); toast.success("Conta removida."); },
    onError: (e) => toast.error(e.message),
  });

  const childrenOf = useMemo(() => {
    const map = new Map<number | null, ChartAccount[]>();
    for (const c of contas ?? []) {
      const key = c.parentId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [contas]);

  const allIds = useMemo(() => (contas ?? []).map((c) => c.id), [contas]);
  const principais = childrenOf.get(null) ?? [];

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Plano de Contas"
        subtitle="Conta principal › conta › subconta › sub-subconta. Alimenta as Receitas, Despesas, Aportes e a DRE."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-background" onClick={() => setExpanded(new Set(allIds))}>Expandir tudo</Button>
            <Button variant="outline" size="sm" className="bg-background" onClick={() => setExpanded(new Set())}>Recolher tudo</Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="divide-y divide-border">
            {principais.map((c) => (
              <AccountNode
                key={c.id}
                conta={c}
                depth={0}
                childrenOf={childrenOf}
                expanded={expanded}
                onToggle={toggle}
                onNovaSub={(parentId) => setNovaSub({ parentId, nome: "" })}
                onEditar={(a) => setEditando({ id: a.id, nome: a.nome })}
                onExcluir={(id) => del.mutate({ id })}
              />
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setNovaPrincipal({ nome: "", grupo: "despesa_fixa" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Nova conta principal
            </Button>
          </div>
        </Card>
      )}

      {/* Nova conta principal: nome livre + natureza */}
      <Dialog open={!!novaPrincipal} onOpenChange={(o) => !o && setNovaPrincipal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Nova conta principal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input
                autoFocus
                value={novaPrincipal?.nome ?? ""}
                onChange={(e) => setNovaPrincipal((p) => (p ? { ...p, nome: e.target.value } : p))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Natureza</Label>
              <Select value={novaPrincipal?.grupo} onValueChange={(v) => setNovaPrincipal((p) => (p ? { ...p, grupo: v as Grupo } : p))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(GRUPO_LABELS) as Grupo[]).map((g) => (
                    <SelectItem key={g} value={g}>{GRUPO_LABELS[g]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-background" onClick={() => setNovaPrincipal(null)}>Cancelar</Button>
            <Button
              disabled={!novaPrincipal?.nome.trim() || create.isPending}
              onClick={() => novaPrincipal && create.mutate({ nome: novaPrincipal.nome.trim(), grupo: novaPrincipal.grupo })}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova sub-conta: só nome, natureza herdada */}
      <Dialog open={!!novaSub} onOpenChange={(o) => !o && setNovaSub(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Nova subconta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label>Nome</Label>
            <Input
              autoFocus
              value={novaSub?.nome ?? ""}
              onChange={(e) => setNovaSub((s) => (s ? { ...s, nome: e.target.value } : s))}
              onKeyDown={(e) => { if (e.key === "Enter" && novaSub?.nome.trim()) create.mutate({ nome: novaSub.nome.trim(), parentId: novaSub.parentId }); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-background" onClick={() => setNovaSub(null)}>Cancelar</Button>
            <Button
              disabled={!novaSub?.nome.trim() || create.isPending}
              onClick={() => novaSub && create.mutate({ nome: novaSub.nome.trim(), parentId: novaSub.parentId })}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar conta */}
      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Editar conta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label>Nome</Label>
            <Input
              autoFocus
              value={editando?.nome ?? ""}
              onChange={(e) => setEditando((s) => (s ? { ...s, nome: e.target.value } : s))}
              onKeyDown={(e) => { if (e.key === "Enter" && editando?.nome.trim()) update.mutate({ id: editando.id, nome: editando.nome.trim() }); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-background" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button disabled={!editando?.nome.trim() || update.isPending} onClick={() => editando && update.mutate({ id: editando.id, nome: editando.nome.trim() })}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const DEPTH_LABEL = (depth: number) => (depth === 0 ? "Conta principal" : depth === 1 ? "Conta" : depth === 2 ? "Subconta" : "Sub-subconta");

function AccountNode({
  conta,
  depth,
  childrenOf,
  expanded,
  onToggle,
  onNovaSub,
  onEditar,
  onExcluir,
}: {
  conta: ChartAccount;
  depth: number;
  childrenOf: Map<number | null, ChartAccount[]>;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  onNovaSub: (parentId: number) => void;
  onEditar: (a: ChartAccount) => void;
  onExcluir: (id: number) => void;
}) {
  const filhos = childrenOf.get(conta.id) ?? [];
  const isOpen = expanded.has(conta.id);

  return (
    <div>
      <div className="group flex items-center gap-2 px-4 py-2.5 hover:bg-secondary/40 transition-colors" style={{ paddingLeft: `${16 + depth * 20}px` }}>
        {filhos.length > 0 ? (
          <button onClick={() => onToggle(conta.id)} className="text-muted-foreground shrink-0">
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className={`flex-1 truncate ${depth === 0 ? "text-sm font-semibold" : "text-sm"}`}>{conta.nome}</span>
        <span className="text-[11px] text-muted-foreground shrink-0">{DEPTH_LABEL(depth)}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {depth < MAX_DEPTH && (
              <DropdownMenuItem onClick={() => onNovaSub(conta.id)}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Subconta
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEditar(conta)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onExcluir(conta.id)}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isOpen && filhos.map((f) => (
        <AccountNode
          key={f.id}
          conta={f}
          depth={depth + 1}
          childrenOf={childrenOf}
          expanded={expanded}
          onToggle={onToggle}
          onNovaSub={onNovaSub}
          onEditar={onEditar}
          onExcluir={onExcluir}
        />
      ))}
    </div>
  );
}
