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
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Package, Pencil } from "lucide-react";
import { PageHeader, EmptyState } from "./Clientes";

interface ItemForm {
  nome: string;
  quantidade: string;
  descricao: string;
}

const emptyForm: ItemForm = { nome: "", quantidade: "1", descricao: "" };

export default function Inventario() {
  const utils = trpc.useUtils();
  const { data: imoveis } = trpc.properties.list.useQuery();
  const [propertyId, setPropertyId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);

  const enabled = !!propertyId;
  const { data: itens, isLoading } = trpc.inventoryItems.list.useQuery(
    { propertyId: Number(propertyId) },
    { enabled },
  );

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const create = trpc.inventoryItems.create.useMutation({
    onSuccess: () => { utils.inventoryItems.list.invalidate(); setOpen(false); reset(); toast.success("Item adicionado."); },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.inventoryItems.update.useMutation({
    onSuccess: () => { utils.inventoryItems.list.invalidate(); setOpen(false); reset(); toast.success("Item atualizado."); },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.inventoryItems.delete.useMutation({
    onSuccess: () => { utils.inventoryItems.list.invalidate(); toast.success("Item removido."); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (i: NonNullable<typeof itens>[number]) => {
    setEditId(i.id);
    setForm({ nome: i.nome, quantidade: String(i.quantidade), descricao: i.descricao || "" });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nome) { toast.error("Informe o nome do item."); return; }
    const qtd = Number(form.quantidade) || 1;
    if (editId) {
      update.mutate({ id: editId, nome: form.nome, quantidade: qtd, descricao: form.descricao || undefined });
    } else {
      create.mutate({ propertyId: Number(propertyId), nome: form.nome, quantidade: qtd, descricao: form.descricao || undefined });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Inventário"
        subtitle="Itens de enxoval e equipamentos por imóvel."
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button disabled={!enabled} className="active:scale-[0.97] transition-transform">
                <Plus className="mr-1 h-4 w-4" /> Novo item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif">{editId ? "Editar item" : "Novo item"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-1.5">
                  <Label>Item</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="ex.: Geladeira" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Quantidade</Label>
                  <Input value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} type="number" min="1" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Descrição (opcional)</Label>
                  <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="bg-background" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={create.isPending || update.isPending}>{editId ? "Salvar alterações" : "Adicionar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6">
        <Select value={propertyId} onValueChange={setPropertyId}>
          <SelectTrigger className="w-[240px] bg-card">
            <SelectValue placeholder="Selecione o imóvel" />
          </SelectTrigger>
          <SelectContent>
            {imoveis?.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.apelido}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!enabled ? (
        <EmptyState title="Selecione um imóvel" subtitle="Escolha a unidade para ver o inventário." />
      ) : isLoading ? (
        <div className="h-40 rounded-xl border border-border bg-card animate-pulse" />
      ) : !itens?.length ? (
        <EmptyState title="Nenhum item cadastrado" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {itens.map((i) => (
              <div key={i.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{i.nome}</p>
                    {i.descricao && <p className="text-xs text-muted-foreground">{i.descricao}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-sm text-muted-foreground">Qtd. {i.quantidade}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(i)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => del.mutate({ id: i.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
