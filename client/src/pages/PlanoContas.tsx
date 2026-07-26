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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, ChevronRight, ChevronDown } from "lucide-react";
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
        title="Plano de contas"
        subtitle="Conta principal › conta › subconta (modalidade) › sub-subconta (despesa)."
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
        <DialogContent className="sm:max-w-[320px] gap-3 p-5">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-base font-semibold">Nova conta principal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Nome</Label>
              <Input
                autoFocus
                className="h-8 focus-visible:ring-2"
                value={novaPrincipal?.nome ?? ""}
                onChange={(e) => setNovaPrincipal((p) => (p ? { ...p, nome: e.target.value } : p))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Natureza</Label>
              <Select value={novaPrincipal?.grupo} onValueChange={(v) => setNovaPrincipal((p) => (p ? { ...p, grupo: v as Grupo } : p))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(GRUPO_LABELS) as Grupo[]).map((g) => (
                    <SelectItem key={g} value={g}>{GRUPO_LABELS[g]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="bg-background" onClick={() => setNovaPrincipal(null)}>Cancelar</Button>
            <Button
              size="sm"
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
        <DialogContent className="sm:max-w-[320px] gap-3 p-5">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-base font-semibold">Nova subconta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label className="text-xs">Nome</Label>
            <Input
              autoFocus
              className="h-8 focus-visible:ring-2"
              value={novaSub?.nome ?? ""}
              onChange={(e) => setNovaSub((s) => (s ? { ...s, nome: e.target.value } : s))}
              onKeyDown={(e) => { if (e.key === "Enter" && novaSub?.nome.trim()) create.mutate({ nome: novaSub.nome.trim(), parentId: novaSub.parentId }); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="bg-background" onClick={() => setNovaSub(null)}>Cancelar</Button>
            <Button
              size="sm"
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
        <DialogContent className="sm:max-w-[320px] gap-3 p-5">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-base font-semibold">Editar conta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label className="text-xs">Nome</Label>
            <Input
              autoFocus
              className="h-8 focus-visible:ring-2"
              value={editando?.nome ?? ""}
              onChange={(e) => setEditando((s) => (s ? { ...s, nome: e.target.value } : s))}
              onKeyDown={(e) => { if (e.key === "Enter" && editando?.nome.trim()) update.mutate({ id: editando.id, nome: editando.nome.trim() }); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="bg-background" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button size="sm" disabled={!editando?.nome.trim() || update.isPending} onClick={() => editando && update.mutate({ id: editando.id, nome: editando.nome.trim() })}>
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
  const podeExpandir = depth < MAX_DEPTH;

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-secondary/40 transition-colors" style={{ paddingLeft: `${16 + depth * 20}px` }}>
        {podeExpandir ? (
          <button onClick={() => onToggle(conta.id)} className="text-muted-foreground shrink-0">
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className={`flex-1 truncate ${depth === 0 ? "text-sm font-semibold" : "text-sm"}`}>{conta.nome}</span>
        <span className="text-[11px] text-muted-foreground shrink-0">{DEPTH_LABEL(depth)}</span>
        {podeExpandir && (
          <Button variant="outline" size="sm" className="h-7 bg-background text-xs shrink-0" onClick={() => onNovaSub(conta.id)}>
            <Plus className="mr-1 h-3 w-3" /> {DEPTH_LABEL(depth + 1)}
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0" onClick={() => onEditar(conta)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onExcluir(conta.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {podeExpandir && isOpen && filhos.length === 0 && (
        <p className="text-xs text-muted-foreground py-2" style={{ paddingLeft: `${16 + (depth + 1) * 20 + 18}px` }}>
          Nenhuma {DEPTH_LABEL(depth + 1).toLowerCase()} cadastrada ainda.
        </p>
      )}
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
