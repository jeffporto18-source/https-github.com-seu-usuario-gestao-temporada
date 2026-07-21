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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, UserCog2, Pencil, MoreHorizontal } from "lucide-react";
import { PageHeader, EmptyState, SkeletonList } from "./Clientes";

interface ManagerForm {
  nome: string;
  telefone: string;
  email: string;
  contato: string;
}

const emptyForm: ManagerForm = { nome: "", telefone: "", email: "", contato: "" };

export default function GestoresTemporada() {
  const utils = trpc.useUtils();
  const { data: gestores, isLoading } = trpc.curtaManagers.list.useQuery();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ManagerForm>(emptyForm);

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const create = trpc.curtaManagers.create.useMutation({
    onSuccess: () => { utils.curtaManagers.list.invalidate(); setOpen(false); reset(); toast.success("Gestor cadastrado."); },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.curtaManagers.update.useMutation({
    onSuccess: () => { utils.curtaManagers.list.invalidate(); setOpen(false); reset(); toast.success("Gestor atualizado."); },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.curtaManagers.delete.useMutation({
    onSuccess: () => { utils.curtaManagers.list.invalidate(); toast.success("Gestor removido."); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (g: NonNullable<typeof gestores>[number]) => {
    setEditId(g.id);
    setForm({ nome: g.nome, telefone: g.telefone || "", email: g.email || "", contato: g.contato || "" });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nome) { toast.error("Informe o nome do gestor."); return; }
    const payload = {
      nome: form.nome,
      telefone: form.telefone || undefined,
      email: form.email || undefined,
      contato: form.contato || undefined,
    };
    if (editId) {
      update.mutate({ id: editId, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Gestores de Temporada"
        subtitle="Terceiros que administram imóveis de curta duração por conta do proprietário."
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="active:scale-[0.97] transition-transform">
                <Plus className="mr-1 h-3.5 w-3.5" /> Novo gestor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-serif">{editId ? "Editar gestor" : "Novo gestor"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-1.5">
                  <Label>Nome</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Pessoa de contato</Label>
                  <Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
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
      ) : !gestores?.length ? (
        <EmptyState title="Nenhum gestor cadastrado" subtitle="Cadastre os gestores de temporada terceirizados." />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="divide-y divide-border">
            {gestores.map((g) => (
              <div key={g.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <UserCog2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{g.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[g.contato, g.telefone, g.email].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(g)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => del.mutate({ id: g.id })}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
