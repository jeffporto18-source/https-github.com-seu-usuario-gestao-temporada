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
import { Plus, Trash2, Landmark, Pencil, MoreHorizontal } from "lucide-react";
import { PageHeader, EmptyState, SkeletonList } from "./Clientes";

interface ImobiliariaForm {
  nome: string;
  telefone: string;
  celular: string;
  whatsapp: string;
  email: string;
  contato: string;
  endereco: string;
}

const emptyForm: ImobiliariaForm = { nome: "", telefone: "", celular: "", whatsapp: "", email: "", contato: "", endereco: "" };

export default function Imobiliarias() {
  const utils = trpc.useUtils();
  const { data: imobiliarias, isLoading } = trpc.imobiliarias.list.useQuery();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ImobiliariaForm>(emptyForm);

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const create = trpc.imobiliarias.create.useMutation({
    onSuccess: () => { utils.imobiliarias.list.invalidate(); setOpen(false); reset(); toast.success("Imobiliária cadastrada."); },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.imobiliarias.update.useMutation({
    onSuccess: () => { utils.imobiliarias.list.invalidate(); setOpen(false); reset(); toast.success("Imobiliária atualizada."); },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.imobiliarias.delete.useMutation({
    onSuccess: () => { utils.imobiliarias.list.invalidate(); toast.success("Imobiliária removida."); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (i: NonNullable<typeof imobiliarias>[number]) => {
    setEditId(i.id);
    setForm({
      nome: i.nome,
      telefone: i.telefone || "",
      celular: i.celular || "",
      whatsapp: i.whatsapp || "",
      email: i.email || "",
      contato: i.contato || "",
      endereco: i.endereco || "",
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nome) { toast.error("Informe o nome da imobiliária."); return; }
    const payload = {
      nome: form.nome,
      telefone: form.telefone || undefined,
      celular: form.celular || undefined,
      whatsapp: form.whatsapp || undefined,
      email: form.email || undefined,
      contato: form.contato || undefined,
      endereco: form.endereco || undefined,
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
        title="Imobiliárias"
        subtitle="Parceiras que captam e gerenciam inquilinos de longa duração."
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="active:scale-[0.97] transition-transform">
                <Plus className="mr-1 h-3.5 w-3.5" /> Nova imobiliária
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-serif">{editId ? "Editar imobiliária" : "Nova imobiliária"}</DialogTitle>
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
                    <Label>Celular</Label>
                    <Input value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>E-mail</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Endereço</Label>
                  <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
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
      ) : !imobiliarias?.length ? (
        <EmptyState title="Nenhuma imobiliária cadastrada" subtitle="Cadastre as parceiras que captam inquilinos para seus imóveis." />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="divide-y divide-border">
            {imobiliarias.map((i) => (
              <div key={i.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Landmark className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{i.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[i.contato, i.whatsapp || i.celular || i.telefone, i.email].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(i)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => del.mutate({ id: i.id })}>
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
