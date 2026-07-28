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
import { Plus, Trash2, Pencil, Truck, Settings } from "lucide-react";
import { PageHeader, EmptyState, SkeletonList } from "./Clientes";
import { formatCpfCnpj } from "@/lib/format";
import { Link } from "wouter";

const NENHUMA = "nenhuma";

interface FornecedorForm {
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  chartAccountId: string;
}

const emptyForm: FornecedorForm = { nome: "", cpfCnpj: "", telefone: "", email: "", chartAccountId: "" };

export default function Fornecedores() {
  const utils = trpc.useUtils();
  const { data: fornecedores, isLoading } = trpc.fornecedores.list.useQuery();
  const { data: contasTodas } = trpc.chartAccounts.list.useQuery({});
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FornecedorForm>(emptyForm);

  // Contas de despesa (fixas e variáveis), achatadas em ordem hierárquica com indentação.
  const contasDespesa = useMemo(() => {
    const todas = (contasTodas ?? []).filter((c) => (c.grupo === "despesa_fixa" || c.grupo === "despesa_variavel") && c.ativa === 1);
    const porPai = new Map<number | null, typeof todas>();
    for (const c of todas) {
      const key = c.parentId ?? null;
      if (!porPai.has(key)) porPai.set(key, []);
      porPai.get(key)!.push(c);
    }
    const out: { id: number; label: string }[] = [];
    const visit = (parentId: number | null, depth: number) => {
      for (const c of porPai.get(parentId) ?? []) {
        out.push({ id: c.id, label: `${"— ".repeat(depth)}${c.nome}` });
        visit(c.id, depth + 1);
      }
    };
    visit(null, 0);
    return out;
  }, [contasTodas]);

  const contaLabelPorId = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of contasDespesa) map.set(c.id, c.label.replace(/^(— )+/, ""));
    return map;
  }, [contasDespesa]);

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
    setForm({
      nome: f.nome,
      cpfCnpj: f.cpfCnpj || "",
      telefone: f.telefone || "",
      email: f.email || "",
      chartAccountId: f.chartAccountId ? String(f.chartAccountId) : "",
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nome.trim()) { toast.error("Informe o nome do fornecedor."); return; }
    const payload = {
      nome: form.nome.trim(),
      cpfCnpj: form.cpfCnpj || undefined,
      telefone: form.telefone || undefined,
      email: form.email || undefined,
      chartAccountId: form.chartAccountId && form.chartAccountId !== NENHUMA ? Number(form.chartAccountId) : undefined,
    };
    if (editId) {
      update.mutate({ id: editId, ...payload, chartAccountId: form.chartAccountId && form.chartAccountId !== NENHUMA ? Number(form.chartAccountId) : null });
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
                <div className="grid gap-1.5">
                  <Label>Conta de despesa (classificação padrão)</Label>
                  <div className="flex gap-2">
                    <Select value={form.chartAccountId || NENHUMA} onValueChange={(v) => setForm({ ...form, chartAccountId: v })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NENHUMA}>Nenhuma</SelectItem>
                        {contasDespesa.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="bg-background shrink-0" asChild title="Gerenciar plano de contas">
                      <Link href="/plano-contas"><Settings className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Ao lançar uma despesa para este fornecedor, essa conta já vem selecionada.</p>
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
              {f.chartAccountId && contaLabelPorId.get(f.chartAccountId) && (
                <p className="mt-2 text-xs">
                  <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">
                    {contaLabelPorId.get(f.chartAccountId)}
                  </span>
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
