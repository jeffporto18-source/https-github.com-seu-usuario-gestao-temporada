import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, User, Building, ShieldCheck, AlertTriangle, Pencil } from "lucide-react";
import { formatCpfCnpj } from "@/lib/format";

type FiscalCat = "pj" | "pf_cbs_ibs" | "pf_isento";

interface ClientForm {
  tipo: "PF" | "PJ";
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  fiscalCategory: FiscalCat;
  certificadoA1Nome: string;
  certificadoA1Validade: string;
}

const emptyForm: ClientForm = { tipo: "PF", nome: "", cpfCnpj: "", email: "", telefone: "", fiscalCategory: "pj", certificadoA1Nome: "", certificadoA1Validade: "" };

const FISCAL_LABELS: Record<FiscalCat, string> = {
  pj: "PJ — Emite NFS-e com CBS/IBS",
  pf_cbs_ibs: "PF — Obrigado a emitir (reforma tributária)",
  pf_isento: "PF — Isento de emissão",
};

export default function Clientes() {
  const utils = trpc.useUtils();
  const { data: clientes, isLoading } = trpc.clients.list.useQuery();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const create = trpc.clients.create.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); setOpen(false); reset(); toast.success("Cliente cadastrado."); },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.clients.update.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); setOpen(false); reset(); toast.success("Cliente atualizado."); },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.clients.delete.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); toast.success("Cliente removido."); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (c: NonNullable<typeof clientes>[number]) => {
    setEditId(c.id);
    setForm({
      tipo: c.tipo as "PF" | "PJ",
      nome: c.nome,
      cpfCnpj: c.cpfCnpj,
      email: c.email || "",
      telefone: c.telefone || "",
      fiscalCategory: (c.fiscalCategory as FiscalCat) || "pj",
      certificadoA1Nome: c.certificadoA1Nome || "",
      certificadoA1Validade: c.certificadoA1Validade ? new Date(c.certificadoA1Validade).toISOString().slice(0, 10) : "",
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nome || !form.cpfCnpj) { toast.error("Nome e CPF/CNPJ são obrigatórios."); return; }
    if (editId) {
      update.mutate({
        id: editId,
        tipo: form.tipo,
        nome: form.nome,
        cpfCnpj: form.cpfCnpj,
        email: form.email || undefined,
        telefone: form.telefone || undefined,
        fiscalCategory: form.fiscalCategory,
        certificadoA1Nome: form.certificadoA1Nome || undefined,
        certificadoA1Validade: form.certificadoA1Validade || undefined,
      });
    } else {
      create.mutate({
        tipo: form.tipo,
        nome: form.nome,
        cpfCnpj: form.cpfCnpj,
        email: form.email || undefined,
        telefone: form.telefone || undefined,
        fiscalCategory: form.fiscalCategory,
        certificadoA1Nome: form.certificadoA1Nome || undefined,
        certificadoA1Validade: form.certificadoA1Validade || undefined,
      });
    }
  };

  const certStatus = (validade: unknown) => {
    if (!validade) return null;
    const dias = Math.ceil((new Date(validade as string).getTime() - Date.now()) / 86400000);
    if (dias < 0) return { label: "Certificado vencido", tone: "destructive" as const };
    if (dias <= 30) return { label: `Vence em ${dias}d`, tone: "warning" as const };
    return { label: "Certificado válido", tone: "ok" as const };
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Clientes"
        subtitle="Proprietários dos imóveis — pessoa física (CPF) ou jurídica (CNPJ)."
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button className="active:scale-[0.97] transition-transform">
                <Plus className="mr-1 h-4 w-4" /> Novo cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-serif">{editId ? "Editar cliente" : "Novo cliente"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "PF" | "PJ" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PF">Pessoa Física (CPF)</SelectItem>
                        <SelectItem value="PJ">Pessoa Jurídica (CNPJ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{form.tipo === "PF" ? "CPF" : "CNPJ"}</Label>
                    <Input value={form.cpfCnpj} onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })} placeholder={form.tipo === "PF" ? "000.000.000-00" : "00.000.000/0001-00"} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Categoria fiscal do proprietário</Label>
                  <Select value={form.fiscalCategory} onValueChange={(v) => setForm({ ...form, fiscalCategory: v as FiscalCat })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pj">Pessoa Jurídica — Emite NFS-e com CBS/IBS</SelectItem>
                      <SelectItem value="pf_cbs_ibs">Pessoa Física — Obrigado a emitir (reforma tributária)</SelectItem>
                      <SelectItem value="pf_isento">Pessoa Física — Isento de emissão</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Define se o motor fiscal emitirá nota de locação para este proprietário.</p>
                </div>
                <div className="grid gap-1.5">
                  <Label>{form.tipo === "PF" ? "Nome completo" : "Razão social"}</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>E-mail</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/50 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Certificado digital A1
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Identificação</Label>
                      <Input value={form.certificadoA1Nome} onChange={(e) => setForm({ ...form, certificadoA1Nome: e.target.value })} placeholder="ex.: A1 2026" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Validade</Label>
                      <DateInput value={form.certificadoA1Validade} onChange={(v) => setForm({ ...form, certificadoA1Validade: v })} />
                    </div>
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
      ) : !clientes?.length ? (
        <EmptyState title="Nenhum cliente cadastrado" subtitle="Comece adicionando o primeiro proprietário." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map((c) => {
            const st = certStatus(c.certificadoA1Validade);
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {c.tipo === "PF" ? <User className="h-5 w-5 text-primary" /> : <Building className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{formatCpfCnpj(c.cpfCnpj)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => del.mutate({ id: c.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{c.tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</Badge>
                  <Badge variant="outline" className="text-xs">{FISCAL_LABELS[(c.fiscalCategory as FiscalCat) || "pj"]}</Badge>
                  {st && (
                    <Badge
                      className={
                        st.tone === "destructive"
                          ? "bg-destructive/10 text-destructive"
                          : st.tone === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-primary/10 text-primary"
                      }
                    >
                      {(st.tone !== "ok") && <AlertTriangle className="mr-1 h-3 w-3" />}
                      {st.label}
                    </Badge>
                  )}
                </div>
                {c.email && <p className="mt-3 text-xs text-muted-foreground truncate">{c.email}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
      <p className="font-medium">{title}</p>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse" />
      ))}
    </div>
  );
}
