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
import { Plus, Trash2, Pencil, UserRound } from "lucide-react";
import { PageHeader, EmptyState, SkeletonList } from "./Clientes";
import { formatCpfCnpj } from "@/lib/format";

interface SocioForm {
  nome: string;
  cpf: string;
}

const emptyForm: SocioForm = { nome: "", cpf: "" };

export default function Socios() {
  const utils = trpc.useUtils();
  const { data: socios, isLoading } = trpc.socios.list.useQuery();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<SocioForm>(emptyForm);

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const create = trpc.socios.create.useMutation({
    onSuccess: () => { utils.socios.list.invalidate(); setOpen(false); reset(); toast.success("Sócio cadastrado."); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.socios.update.useMutation({
    onSuccess: () => { utils.socios.list.invalidate(); setOpen(false); reset(); toast.success("Sócio atualizado."); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.socios.delete.useMutation({
    onSuccess: () => { utils.socios.list.invalidate(); toast.success("Sócio removido."); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (s: NonNullable<typeof socios>[number]) => {
    setEditId(s.id);
    setForm({ nome: s.nome, cpf: s.cpf });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nome.trim()) { toast.error("Informe o nome do sócio."); return; }
    if (!form.cpf.trim()) { toast.error("Informe o CPF do sócio."); return; }
    const payload = { nome: form.nome.trim(), cpf: form.cpf.trim() };
    if (editId) {
      update.mutate({ id: editId, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Sócios"
        subtitle="Cadastro dos sócios da empresa."
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button className="active:scale-[0.97] transition-transform">
                <Plus className="mr-1 h-4 w-4" /> Novo sócio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-serif">{editId ? "Editar sócio" : "Novo sócio"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label>Nome</Label>
                  <Input autoFocus value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
                </div>
                <div className="grid gap-1.5">
                  <Label>CPF</Label>
                  <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
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
      ) : !socios?.length ? (
        <EmptyState title="Nenhum sócio cadastrado" subtitle="Cadastre o primeiro sócio da empresa." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {socios.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.nome}</p>
                    <p className="text-xs text-muted-foreground">{formatCpfCnpj(s.cpf)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => del.mutate({ id: s.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
