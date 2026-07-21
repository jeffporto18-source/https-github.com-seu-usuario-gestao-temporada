import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
import { Plus, Trash2, Receipt, Pencil, Settings } from "lucide-react";
import { brl, competenciaAtual } from "@/lib/format";
import { PageHeader, EmptyState } from "./Clientes";
import { UnitPeriodFilter } from "@/components/UnitPeriodFilter";

interface ExpenseForm {
  categoria: string;
  valor: string;
  descricao: string;
  competencia: string;
}

const emptyForm: ExpenseForm = { categoria: "", valor: "", descricao: "", competencia: "" };

export default function Despesas() {
  const utils = trpc.useUtils();
  const { data: imoveis } = trpc.properties.list.useQuery();
  const { data: categorias } = trpc.expenseCategories.list.useQuery();
  const [propertyId, setPropertyId] = useState<string>("");
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  const enabled = !!propertyId;
  const { data: despesas, isLoading } = trpc.expenses.list.useQuery(
    { propertyId: Number(propertyId), competencia },
    { enabled },
  );

  const total = useMemo(() => (despesas ?? []).reduce((s, e) => s + Number(e.valor), 0), [despesas]);

  const activeCategorias = useMemo(() => (categorias ?? []).filter(c => c.ativa === 1), [categorias]);

  const catLabel = (catName: string | null) => {
    if (!catName) return "—";
    return catName;
  };

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const create = trpc.expenses.create.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); setOpen(false); reset(); toast.success("Despesa lançada."); },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.expenses.update.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); setOpen(false); reset(); toast.success("Despesa atualizada."); },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.expenses.delete.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); toast.success("Despesa removida."); },
    onError: (e) => toast.error(e.message),
  });

  const createCat = trpc.expenseCategories.create.useMutation({
    onSuccess: () => { utils.expenseCategories.list.invalidate(); setNewCatName(""); toast.success("Categoria criada."); },
    onError: (e) => toast.error(e.message),
  });

  const updateCat = trpc.expenseCategories.update.useMutation({
    onSuccess: () => { utils.expenseCategories.list.invalidate(); setEditingCatId(null); setEditingCatName(""); toast.success("Categoria atualizada."); },
    onError: (e) => toast.error(e.message),
  });

  const deleteCat = trpc.expenseCategories.delete.useMutation({
    onSuccess: () => { utils.expenseCategories.list.invalidate(); toast.success("Categoria removida."); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (e: NonNullable<typeof despesas>[number]) => {
    setEditId(e.id);
    setForm({ categoria: e.categoria || "", valor: String(Number(e.valor)), descricao: e.descricao || "", competencia: e.competencia });
    setOpen(true);
  };

  const submit = () => {
    const v = Number(form.valor);
    if (!v || v <= 0) { toast.error("Informe um valor válido."); return; }
    if (!form.categoria) { toast.error("Selecione uma categoria."); return; }
    if (editId) {
      update.mutate({ id: editId, categoria: form.categoria, valor: v, competencia: form.competencia || undefined, descricao: form.descricao || undefined });
    } else {
      create.mutate({ propertyId: Number(propertyId), categoria: form.categoria, valor: v, competencia, descricao: form.descricao || undefined });
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Despesas operacionais"
        subtitle="Custos recorrentes por unidade."
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!enabled} className="active:scale-[0.97] transition-transform">
                <Plus className="mr-1 h-3.5 w-3.5" /> Nova despesa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif">{editId ? "Editar despesa" : "Nova despesa"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-1.5">
                  <Label>Categoria</Label>
                  <div className="flex gap-2">
                    <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {activeCategorias.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="bg-background shrink-0" onClick={() => setCatDialogOpen(true)} title="Gerenciar categorias">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Valor (R$)</Label>
                  <Input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} type="number" step="0.01" placeholder="0,00" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Descrição (opcional)</Label>
                  <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
                {editId ? (
                  <div className="grid gap-1.5">
                    <Label>Competência</Label>
                    <Input value={form.competencia || competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} type="month" />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Competência: {competencia}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" className="bg-background" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={create.isPending || update.isPending}>{editId ? "Salvar alterações" : "Lançar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Dialog de gerenciamento de categorias */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Gerenciar categorias</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-64 overflow-y-auto">
            {(categorias ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                {editingCatId === c.id ? (
                  <Input
                    className="h-7 text-sm flex-1 mr-2"
                    value={editingCatName}
                    onChange={(e) => setEditingCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && editingCatName.trim()) updateCat.mutate({ id: c.id, nome: editingCatName.trim() }); if (e.key === "Escape") { setEditingCatId(null); setEditingCatName(""); } }}
                    autoFocus
                  />
                ) : (
                  <span className="text-sm font-medium cursor-pointer hover:text-primary" onClick={() => { setEditingCatId(c.id); setEditingCatName(c.nome); }}>{c.nome}</span>
                )}
                <div className="flex gap-1">
                  {editingCatId === c.id ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" disabled={!editingCatName.trim()} onClick={() => updateCat.mutate({ id: c.id, nome: editingCatName.trim() })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteCat.mutate({ id: c.id })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input placeholder="Nova categoria..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newCatName.trim()) createCat.mutate({ nome: newCatName.trim() }); }} />
            <Button size="sm" disabled={!newCatName.trim() || createCat.isPending} onClick={() => createCat.mutate({ nome: newCatName.trim() })}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UnitPeriodFilter
        properties={imoveis}
        propertyId={propertyId}
        setPropertyId={setPropertyId}
        competencia={competencia}
        setCompetencia={setCompetencia}
      />

      {!enabled ? (
        <EmptyState title="Selecione um imóvel" subtitle="Escolha a unidade e a competência para lançar despesas." />
      ) : isLoading ? (
        <div className="h-40 rounded-xl border border-border bg-card animate-pulse" />
      ) : !despesas?.length ? (
        <EmptyState title="Nenhuma despesa no período" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {despesas.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{catLabel(e.categoria)}</p>
                    {e.descricao && <p className="text-xs text-muted-foreground">{e.descricao}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums font-medium">{brl(e.valor)}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(e)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => del.mutate({ id: e.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-5 py-4 bg-secondary/50 border-t border-border">
            <span className="text-sm font-medium">Total do período</span>
            <span className="tabular-nums font-serif text-lg font-semibold text-primary">{brl(total)}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
