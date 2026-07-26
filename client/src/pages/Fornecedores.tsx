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
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Truck } from "lucide-react";
import { PageHeader, EmptyState, SkeletonList } from "./Clientes";
import { formatCpfCnpj } from "@/lib/format";

interface FornecedorForm {
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
}

const emptyForm: FornecedorForm = { nome: "", cpfCnpj: "", telefone: "", email: "" };

export default function Fornecedores() {
  const utils = trpc.useUtils();
  const { data: fornecedores, isLoading } = trpc.fornecedores.list.useQuery();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FornecedorForm>(emptyForm);

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const create = trpc.fornecedores.create.useMutation({
    onSuccess: () => { utils.fornecedores.list.invalidate(); setOpen(false); reset(); toast.success("Fornecedor cadastrado."); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.fornecedores.update.useMutation({
    onSuccess: () => { utils.fornecedores.list.invalidate(); setOpen(false); reset(); toast.success("Fornecedor atualizado."); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.fornecedores.delete.useMutation({
    onSuccess: () => { utils.fornecedores.list.invalidate(); toast.success("Fornecedor removido."); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (f: NonNullable<typeof fornecedores>[number]) => {
    setEditId(f.id);
    setForm({ nome: f.nome, cpfCnpj: f.cpfCnpj || "", telefone: f.telefone || "", email: f.email || "" });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nome.trim()) { toast.error("Informe o nome do fornecedor."); return; }
    const payload = {
      nome: form.nome.trim(),
      cpfCnpj: form.cpfCnpj || undefined,
      telefone: form.telefone || undefined,
      email: form.email || undefined,
    };
    if (editId) {
      update.mutate({ id: editId, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Fornecedores"
        subtitle="Cadastre os fornecedores para vinculá-los rapidamente ao lançar despesas."
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button className="active:scale-[0.97] transition-transform">
                <Plus className="mr-1 h-4 w-4" /> Novo fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-serif">{editId ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label>Nome</Label>
                  <Input autoFocus value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Empresa de limpeza" />
                </div>
                <div className="grid gap-1.5">
                  <Label>CPF/CNPJ (opcional)</Label>
                  <Input value={form.cpfCnpj} onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>E-mail</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="bg-background" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={create.isPending || update.isPending}>{editId ? "Salvar alterações" : "Salvar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <SkeletonList />
      ) : !fornecedores?.length ? (
        <EmptyState title="Nenhum fornecedor cadastrado" subtitle="Cadastre o primeiro para usá-lo nas despesas." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fornecedores.map((f) => (
            <Card key={f.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{f.nome}</p>
                    {f.cpfCnpj && <p className="text-xs text-muted-foreground">{formatCpfCnpj(f.cpfCnpj)}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(f)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => del.mutate({ id: f.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {(f.telefone || f.email) && (
                <p className="mt-3 text-xs text-muted-foreground truncate">
                  {[f.telefone, f.email].filter(Boolean).join(" · ")}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
