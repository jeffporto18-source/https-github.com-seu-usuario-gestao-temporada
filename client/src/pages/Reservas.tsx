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
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileText, CalendarDays, CheckCircle2, Loader2, Pencil } from "lucide-react";
import { brl, competenciaAtual } from "@/lib/format";
import { PageHeader, EmptyState } from "./Clientes";
import { UnitPeriodFilter } from "@/components/UnitPeriodFilter";

interface ReservaForm {
  codigo: string;
  valorBruto: string;
  taxaLimpeza: string;
  taxaAirbnb: string;
  checkin: string;
  checkout: string;
  faxinas: string;
}

const emptyForm: ReservaForm = { codigo: "", valorBruto: "", taxaLimpeza: "", taxaAirbnb: "4", checkin: "", checkout: "", faxinas: "1" };

export default function Reservas() {
  const utils = trpc.useUtils();
  const { data: todosImoveis } = trpc.properties.list.useQuery();
  const imoveis = useMemo(() => (todosImoveis ?? []).filter((p) => p.tipoLocacao === "curta"), [todosImoveis]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ReservaForm>(emptyForm);
  const [notaOpen, setNotaOpen] = useState(false);
  const [notaData, setNotaData] = useState<{ locacao: unknown; comissao: unknown } | null>(null);

  const enabled = !!propertyId;
  const { data: reservas, isLoading } = trpc.reservations.list.useQuery(
    { propertyId: Number(propertyId), competencia },
    { enabled },
  );

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const create = trpc.reservations.create.useMutation({
    onSuccess: () => { utils.reservations.list.invalidate(); setOpen(false); reset(); toast.success("Reserva registrada."); },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.reservations.update.useMutation({
    onSuccess: () => { utils.reservations.list.invalidate(); setOpen(false); reset(); toast.success("Reserva atualizada."); },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.reservations.delete.useMutation({
    onSuccess: () => { utils.reservations.list.invalidate(); toast.success("Reserva removida."); },
    onError: (e) => toast.error(e.message),
  });

  const emitir = trpc.reservations.emitir.useMutation({
    onSuccess: (res) => {
      utils.reservations.list.invalidate();
      setNotaData({ locacao: res.resultado.notaLocacao, comissao: res.resultado.notaComissao });
      setNotaOpen(true);
      toast.success("NFS-e emitidas (locação + comissão).");
    },
    onError: (e) => toast.error(e.message),
  });

  const noites = (a: string, b: string) => {
    if (!a || !b) return 1;
    const d = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
    return Math.max(1, d);
  };

  const openEdit = (r: NonNullable<typeof reservas>[number]) => {
    setEditId(r.id);
    setForm({
      codigo: r.codigo,
      valorBruto: String(Number(r.valorBruto)),
      taxaLimpeza: String(Number(r.taxaLimpeza)),
      taxaAirbnb: String(Number(r.taxaAirbnbPct)),
      checkin: new Date(r.checkin).toISOString().slice(0, 10),
      checkout: new Date(r.checkout).toISOString().slice(0, 10),
      faxinas: String(r.faxinasUtilizadas ?? 1),
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.codigo || !form.valorBruto || !form.checkin || !form.checkout) {
      toast.error("Preencha código, valor e período.");
      return;
    }
    if (editId) {
      update.mutate({
        id: editId,
        codigo: form.codigo,
        valorBruto: Number(form.valorBruto),
        taxaLimpeza: Number(form.taxaLimpeza) || 0,
        taxaAirbnbPct: Number(form.taxaAirbnb) || 4,
        checkin: form.checkin,
        checkout: form.checkout,
        noites: noites(form.checkin, form.checkout),
        faxinasUtilizadas: Number(form.faxinas) || 1,
      });
    } else {
      create.mutate({
        propertyId: Number(propertyId),
        codigo: form.codigo,
        valorBruto: Number(form.valorBruto),
        taxaLimpeza: Number(form.taxaLimpeza) || 0,
        taxaAirbnbPct: Number(form.taxaAirbnb) || 4,
        checkin: form.checkin,
        checkout: form.checkout,
        noites: noites(form.checkin, form.checkout),
        faxinasUtilizadas: Number(form.faxinas) || 1,
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Reservas"
        subtitle="Registre as reservas e emita as notas fiscais (locação + comissão) por operação."
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button disabled={!enabled} className="active:scale-[0.97] transition-transform">
                <Plus className="mr-1 h-4 w-4" /> Nova reserva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif">{editId ? "Editar reserva" : "Nova reserva"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-1.5">
                  <Label>Código da reserva (Airbnb)</Label>
                  <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="ex.: HMABCDE123" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Valor diárias</Label>
                    <Input value={form.valorBruto} onChange={(e) => setForm({ ...form, valorBruto: e.target.value })} type="number" step="0.01" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Taxa limpeza</Label>
                    <Input value={form.taxaLimpeza} onChange={(e) => setForm({ ...form, taxaLimpeza: e.target.value })} type="number" step="0.01" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Taxa Airbnb (%)</Label>
                    <Input value={form.taxaAirbnb} onChange={(e) => setForm({ ...form, taxaAirbnb: e.target.value })} type="number" step="0.01" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Check-in</Label>
                    <Input value={form.checkin} onChange={(e) => setForm({ ...form, checkin: e.target.value })} type="date" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Check-out</Label>
                    <Input value={form.checkout} onChange={(e) => setForm({ ...form, checkout: e.target.value })} type="date" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Faxinas utilizadas</Label>
                  <Input value={form.faxinas} onChange={(e) => setForm({ ...form, faxinas: e.target.value })} type="number" min="0" step="1" />
                  <p className="text-xs text-muted-foreground">Gera despesa automática conforme custo configurado no imóvel.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="bg-background" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={create.isPending || update.isPending}>{editId ? "Salvar alterações" : "Registrar"}</Button>
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

      {!todosImoveis?.length ? null : !imoveis.length ? (
        <EmptyState title="Nenhum imóvel de curta duração" subtitle="Reservas são apenas para imóveis de curta duração (temporada). Ajuste o tipo de locação em Imóveis." />
      ) : !enabled ? (
        <EmptyState title="Selecione um imóvel" subtitle="Escolha a unidade e a competência para ver as reservas." />
      ) : isLoading ? (
        <div className="h-40 rounded-xl border border-border bg-card animate-pulse" />
      ) : !reservas?.length ? (
        <EmptyState title="Nenhuma reserva no período" />
      ) : (
        <div className="space-y-3">
          {reservas.map((r) => (
            <ReservaCard
              key={r.id}
              reserva={r}
              onDelete={() => del.mutate({ id: r.id })}
              onEmitir={() => emitir.mutate({ reservationId: r.id })}
              onEdit={() => openEdit(r)}
              emitindo={emitir.isPending && emitir.variables?.reservationId === r.id}
            />
          ))}
        </div>
      )}

      {/* Modal com os payloads das notas */}
      <Dialog open={notaOpen} onOpenChange={setNotaOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> NFS-e emitidas
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Duas notas geradas para esta reserva. Os payloads abaixo são exatamente o que seria enviado ao provedor fiscal
            (Nuvem Fiscal / Focus NFe) no padrão nacional.
          </p>
          <div className="grid gap-4 max-h-[55vh] overflow-auto">
            <PayloadBox title="Nota de Locação (proprietário — 99.03.01)" data={notaData?.locacao} />
            <PayloadBox title="Nota de Comissão (administradora)" data={notaData?.comissao} />
          </div>
          <DialogFooter>
            <Button onClick={() => setNotaOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReservaCard({
  reserva,
  onDelete,
  onEmitir,
  onEdit,
  emitindo,
}: {
  reserva: { id: number; codigo: string; valorBruto: string; taxaLimpeza: string; taxaAirbnbPct: string; checkin: unknown; checkout: unknown; noites: number; faxinasUtilizadas: number | null };
  onDelete: () => void;
  onEmitir: () => void;
  onEdit: () => void;
  emitindo: boolean;
}) {
  const { data: notas } = trpc.reservations.invoices.useQuery({ reservationId: reserva.id });
  const emitida = (notas?.length ?? 0) > 0;
  const fmt = (d: unknown) => new Date(d as string).toLocaleDateString("pt-BR");

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{reserva.codigo}</p>
            <p className="text-xs text-muted-foreground">
              {fmt(reserva.checkin)} → {fmt(reserva.checkout)} · {reserva.noites} noites
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {emitida ? (
            <Badge className="bg-primary/10 text-primary"><CheckCircle2 className="mr-1 h-3 w-3" /> NFS-e emitida</Badge>
          ) : (
            <Badge variant="secondary">Pendente</Badge>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <Info label="Diárias" value={brl(reserva.valorBruto)} />
        <Info label="Taxa limpeza" value={brl(reserva.taxaLimpeza)} />
        <Info label="Receita bruta" value={brl(Number(reserva.valorBruto) + Number(reserva.taxaLimpeza))} strong />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={onEmitir} disabled={emitindo} className="active:scale-[0.97] transition-transform">
          {emitindo ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileText className="mr-1 h-4 w-4" />}
          {emitida ? "Reemitir NFS-e" : "Emitir NFS-e"}
        </Button>
        <Button size="sm" variant="outline" className="text-muted-foreground hover:text-primary" onClick={onEdit}>
          <Pencil className="mr-1 h-4 w-4" /> Editar
        </Button>
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`tabular-nums ${strong ? "font-semibold text-primary" : "font-medium"}`}>{value}</p>
    </div>
  );
}

function PayloadBox({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="bg-secondary px-4 py-2 text-sm font-medium">{title}</div>
      <pre className="p-4 text-xs overflow-auto bg-card font-mono leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
