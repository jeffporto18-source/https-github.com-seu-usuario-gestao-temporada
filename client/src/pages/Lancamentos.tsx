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
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Settings, CalendarClock, Receipt, Sparkles, TrendingUp, PiggyBank } from "lucide-react";
import { brl, competenciaAtual } from "@/lib/format";
import { PageHeader, EmptyState } from "./Clientes";
import { UnitPeriodFilter } from "@/components/UnitPeriodFilter";
import { Link } from "wouter";

type Grupo = "despesa_fixa" | "despesa_variavel" | "investimento" | "receita" | "aporte_capital";

const GRUPO_INFO: Record<Grupo, { label: string; icon: typeof Receipt; badgeClass: string }> = {
  despesa_fixa: { label: "Despesa Fixa", icon: CalendarClock, badgeClass: "border-amber-300 text-amber-700" },
  despesa_variavel: { label: "Despesa Variável", icon: Receipt, badgeClass: "border-blue-300 text-blue-700" },
  investimento: { label: "Investimento", icon: Sparkles, badgeClass: "border-primary/40 text-primary" },
  receita: { label: "Receita", icon: TrendingUp, badgeClass: "border-emerald-300 text-emerald-700" },
  aporte_capital: { label: "Aporte de Capital", icon: PiggyBank, badgeClass: "border-violet-300 text-violet-700" },
};

interface LancamentoForm {
  grupo: Grupo;
  chartAccountId: string;
  valor: string;
  descricao: string;
}

const emptyForm: LancamentoForm = { grupo: "despesa_variavel", chartAccountId: "", valor: "", descricao: "" };

export default function Lancamentos() {
  const utils = trpc.useUtils();
  const { data: imoveis } = trpc.properties.list.useQuery();
  const [propertyId, setPropertyId] = useState<string>("");
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LancamentoForm>(emptyForm);

  const enabled = !!propertyId;

  const { data: lancamentosRaw, isLoading } = trpc.ledgerEntries.list.useQuery(
    { propertyId: Number(propertyId), competencia },
    { enabled },
  );
  const { data: contas } = trpc.chartAccounts.list.useQuery({ grupo: form.grupo });

  const lancamentos = useMemo(
    () => (lancamentosRaw ?? []).map((l) => ({ ...l, valor: Number(l.valor) })),
    [lancamentosRaw],
  );

  const total = useMemo(() => lancamentos.reduce((s, l) => s + l.valor, 0), [lancamentos]);

  // Contas do grupo selecionado, achatadas em ordem hierárquica (pai seguido de seus descendentes, indentados).
  const contasOrdenadas = useMemo(() => {
    const todas = contas ?? [];
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
  }, [contas]);

  const reset = () => { setForm(emptyForm); setEditingId(null); };

  const create = trpc.ledgerEntries.create.useMutation({
    onSuccess: () => { utils.ledgerEntries.list.invalidate(); setOpen(false); reset(); toast.success("Lançamento criado."); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.ledgerEntries.update.useMutation({
    onSuccess: () => { utils.ledgerEntries.list.invalidate(); setOpen(false); reset(); toast.success("Lançamento atualizado."); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.ledgerEntries.delete.useMutation({
    onSuccess: () => { utils.ledgerEntries.list.invalidate(); toast.success("Lançamento removido."); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (l: (typeof lancamentos)[number]) => {
    setEditingId(l.id);
    setForm({ grupo: l.grupo as Grupo, chartAccountId: "", valor: String(l.valor), descricao: l.descricao || "" });
    setOpen(true);
  };

  const submit = () => {
    const valor = Number(form.valor);
    if (!valor || valor <= 0) { toast.error("Informe um valor válido."); return; }
    if (!form.chartAccountId) { toast.error("Selecione a conta."); return; }
    const chartAccountId = Number(form.chartAccountId);

    if (editingId) {
      update.mutate({ id: editingId, chartAccountId, valor, descricao: form.descricao || undefined });
      return;
    }

    create.mutate({ propertyId: Number(propertyId), chartAccountId, valor, competencia, descricao: form.descricao || undefined });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Lançamentos"
        subtitle="Despesas, investimentos, receitas e aportes por unidade, classificados no plano de contas."
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!enabled} className="active:scale-[0.97] transition-transform">
                <Plus className="mr-1 h-3.5 w-3.5" /> Novo lançamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif">{editingId ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-1.5">
                  <Label>Grupo</Label>
                  <Select
                    value={form.grupo}
                    disabled={!!editingId}
                    onValueChange={(v) => setForm((f) => ({ ...f, grupo: v as Grupo, chartAccountId: "" }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(GRUPO_INFO) as Grupo[]).map((g) => (
                        <SelectItem key={g} value={g}>{GRUPO_INFO[g].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Conta</Label>
                  <div className="flex gap-2">
                    <Select value={form.chartAccountId} onValueChange={(v) => setForm((f) => ({ ...f, chartAccountId: v }))}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {contasOrdenadas.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="bg-background shrink-0" asChild title="Gerenciar plano de contas">
                      <Link href="/plano-contas"><Settings className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Valor (R$)</Label>
                  <Input value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} type="number" step="0.01" placeholder="0,00" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Descrição (opcional)</Label>
                  <Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
                </div>
                <p className="text-xs text-muted-foreground">Competência: {competencia}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" className="bg-background" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={create.isPending || update.isPending}>
                  {editingId ? "Salvar alterações" : "Lançar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <UnitPeriodFilter
        properties={imoveis}
        propertyId={propertyId}
        setPropertyId={setPropertyId}
        competencia={competencia}
        setCompetencia={setCompetencia}
      />

      {!enabled ? (
        <EmptyState title="Selecione um imóvel" subtitle="Escolha a unidade e a competência para lançar." />
      ) : isLoading ? (
        <div className="h-40 rounded-xl border border-border bg-card animate-pulse" />
      ) : !lancamentos.length ? (
        <EmptyState title="Nenhum lançamento no período" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {lancamentos.map((l) => {
              const info = GRUPO_INFO[l.grupo as Grupo];
              const Icon = info.icon;
              return (
                <div key={l.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{l.categoria || "—"}</p>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${info.badgeClass}`}>{info.label}</Badge>
                      </div>
                      {l.descricao && <p className="text-xs text-muted-foreground truncate">{l.descricao}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="tabular-nums font-medium">{brl(l.valor)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(l)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => del.mutate({ id: l.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
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
