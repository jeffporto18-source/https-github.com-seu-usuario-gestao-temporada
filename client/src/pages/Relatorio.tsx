import { trpc, type RouterOutputs } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Circle, CheckCircle2, Ban, RotateCcw, Paperclip, ExternalLink, Loader2 } from "lucide-react";
import { brl, formatDate, formatCompetencia } from "@/lib/format";
import { PageHeader, EmptyState, SkeletonList } from "./Clientes";

type Charge = RouterOutputs["ledgerCharges"]["list"][number];
type Tipo = "" | "despesa" | "receita";

export default function Relatorio() {
  const utils = trpc.useUtils();
  const { data: imoveis } = trpc.properties.list.useQuery();
  const [tipo, setTipo] = useState<Tipo>("");
  const [propertyId, setPropertyId] = useState<string>("");
  const [vencimentoDe, setVencimentoDe] = useState("");
  const [vencimentoAte, setVencimentoAte] = useState("");
  const [baixando, setBaixando] = useState<Charge | null>(null);

  const { data: chargesRaw, isLoading } = trpc.ledgerCharges.list.useQuery({
    propertyId: propertyId ? Number(propertyId) : undefined,
  });

  const nomeImovel = (id: number) => imoveis?.find((p) => p.id === id)?.apelido ?? "—";

  const reabrir = trpc.ledgerCharges.reabrir.useMutation({
    onSuccess: () => { utils.ledgerCharges.list.invalidate(); toast.success("Movido de volta para em aberto."); },
    onError: (e) => toast.error(e.message),
  });
  const cancelar = trpc.ledgerCharges.cancelar.useMutation({
    onSuccess: () => { utils.ledgerCharges.list.invalidate(); toast.success("Mês cancelado."); },
    onError: (e) => toast.error(e.message),
  });

  const charges = useMemo(
    () =>
      (chargesRaw ?? []).filter((c) => {
        if (tipo === "despesa" && c.grupo !== "despesa_fixa" && c.grupo !== "despesa_variavel") return false;
        if (tipo === "receita" && c.grupo !== "receita") return false;
        if (c.grupo === "aporte_capital") return false;
        if (vencimentoDe && c.dataVencimento < vencimentoDe) return false;
        if (vencimentoAte && c.dataVencimento > vencimentoAte) return false;
        return true;
      }),
    [chargesRaw, tipo, vencimentoDe, vencimentoAte],
  );
  const filtroAtivo = !!vencimentoDe || !!vencimentoAte;

  const grupos = useMemo(() => {
    const mapa = new Map<string, Charge[]>();
    for (const c of charges) {
      if (!mapa.has(c.competencia)) mapa.set(c.competencia, []);
      mapa.get(c.competencia)!.push(c);
    }
    return Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([competencia, itens]) => ({
        competencia,
        abertos: itens.filter((c) => c.status === "aberto").sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)),
        pagos: itens.filter((c) => c.status === "pago").sort((a, b) => (b.dataPagamento ?? "").localeCompare(a.dataPagamento ?? "")),
        cancelados: itens.filter((c) => c.status === "cancelado"),
      }));
  }, [charges]);

  const totalAPagar = useMemo(
    () => charges.filter((c) => c.status === "aberto" && (c.grupo === "despesa_fixa" || c.grupo === "despesa_variavel")).reduce((s, c) => s + Number(c.valor), 0),
    [charges],
  );
  const totalAReceber = useMemo(
    () => charges.filter((c) => c.status === "aberto" && c.grupo === "receita").reduce((s, c) => s + Number(c.valor), 0),
    [charges],
  );

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Relatório"
        subtitle="Contas a Pagar e a Receber mês a mês: dê baixa e anexe o comprovante de cada uma."
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label className="text-[11px] text-muted-foreground">Tipo</Label>
            <Select value={tipo || "todos"} onValueChange={(v) => setTipo(v === "todos" ? "" : (v as Tipo))}>
              <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Tudo</SelectItem>
                <SelectItem value="receita">Só a receber</SelectItem>
                <SelectItem value="despesa">Só a pagar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-[11px] text-muted-foreground">Imóvel</Label>
            <Select value={propertyId || "todos"} onValueChange={(v) => setPropertyId(v === "todos" ? "" : v)}>
              <SelectTrigger className="h-8 w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {imoveis?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.apelido}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-[11px] text-muted-foreground">Vencimento de</Label>
            <DateInput value={vencimentoDe} onChange={setVencimentoDe} className="h-8 w-[150px]" />
          </div>
          <div className="grid gap-1">
            <Label className="text-[11px] text-muted-foreground">até</Label>
            <DateInput value={vencimentoAte} onChange={setVencimentoAte} className="h-8 w-[150px]" />
          </div>
          {filtroAtivo && (
            <Button variant="ghost" size="sm" className="h-8" onClick={() => { setVencimentoDe(""); setVencimentoAte(""); }}>
              Limpar filtro
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <SkeletonList />
      ) : !grupos.length ? (
        <EmptyState title="Nada por aqui" subtitle="Cadastre contas em Contas a Pagar ou Contas a Receber para elas aparecerem aqui mês a mês." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Card className="px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground">Total a pagar (em aberto)</p>
              <p className="text-lg font-serif font-semibold leading-tight">{brl(totalAPagar)}</p>
            </Card>
            <Card className="px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground">Total a receber (em aberto)</p>
              <p className="text-lg font-serif font-semibold text-primary leading-tight">{brl(totalAReceber)}</p>
            </Card>
          </div>

          <div className="space-y-3">
            {grupos.map((g) => (
              <Card key={g.competencia} className="overflow-hidden py-0">
                <div className="px-3 py-1.5 bg-secondary/50 border-b border-border">
                  <span className="text-sm font-serif font-semibold capitalize">{formatCompetencia(g.competencia)}</span>
                </div>

                {g.abertos.map((c) => (
                  <ChargeRow key={c.id} charge={c} nomeImovel={nomeImovel(c.propertyId)}>
                    <button className="flex items-center gap-1.5 min-w-0 text-left" onClick={() => setBaixando(c)} title={c.grupo === "receita" ? "Marcar como recebido" : "Dar baixa"}>
                      <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <RowLabel charge={c} nomeImovel={nomeImovel(c.propertyId)} />
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <ComprovanteControle charge={c} />
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => cancelar.mutate({ id: c.id })} title="Cancelar mês">
                        <Ban className="h-3 w-3" />
                      </Button>
                    </div>
                  </ChargeRow>
                ))}

                {g.pagos.length > 0 && (
                  <div className={g.abertos.length > 0 ? "border-t border-border" : ""}>
                    <p className="px-3 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">Baixados</p>
                    {g.pagos.map((c) => (
                      <ChargeRow key={c.id} charge={c} nomeImovel={nomeImovel(c.propertyId)} tom="bg-primary/5">
                        <button className="flex items-center gap-1.5 min-w-0 text-left" onClick={() => reabrir.mutate({ id: c.id })} title="Voltar para em aberto">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          <RowLabel charge={c} nomeImovel={nomeImovel(c.propertyId)} pago />
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <ComprovanteControle charge={c} />
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => reabrir.mutate({ id: c.id })} title="Reabrir">
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      </ChargeRow>
                    ))}
                  </div>
                )}

                {g.cancelados.length > 0 && (
                  <div className="border-t border-border">
                    <p className="px-3 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Cancelados</p>
                    {g.cancelados.map((c) => (
                      <ChargeRow key={c.id} charge={c} nomeImovel={nomeImovel(c.propertyId)} tom="opacity-60">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Ban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <RowLabel charge={c} nomeImovel={nomeImovel(c.propertyId)} />
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => reabrir.mutate({ id: c.id })} title="Reabrir">
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </ChargeRow>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <BaixaDialog charge={baixando} onOpenChange={(o) => !o && setBaixando(null)} />
    </div>
  );
}

function RowLabel({ charge, nomeImovel, pago }: { charge: Charge; nomeImovel: string; pago?: boolean }) {
  const entrada = charge.grupo === "receita";
  return (
    <span className="min-w-0">
      <span className="font-medium truncate block">
        {nomeImovel} — {charge.descricao || charge.categoria || "—"}
      </span>
      <span className="text-[11px] text-muted-foreground block">
        {pago
          ? `${entrada ? "Recebido" : "Pago"} ${charge.dataPagamento ? formatDate(charge.dataPagamento) : "—"} · ${brl(charge.valorPago ?? charge.valor)}`
          : `Vence ${formatDate(charge.dataVencimento)} · ${brl(charge.valor)}${charge.contraparte ? ` · ${charge.contraparte}` : ""}`}
      </span>
    </span>
  );
}

function ChargeRow({
  charge,
  nomeImovel,
  tom,
  children,
}: {
  charge: Charge;
  nomeImovel: string;
  tom?: string;
  children: React.ReactNode;
}) {
  void nomeImovel;
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-1.5 text-xs border-b border-border/60 last:border-0 ${tom ?? ""}`}>
      {children}
    </div>
  );
}

function ComprovanteControle({ charge }: { charge: Charge }) {
  const utils = trpc.useUtils();
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chargeId", String(charge.id));
      const resp = await fetch("/api/upload/comprovante-lancamento", { method: "POST", body: formData });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro ao enviar." }));
        throw new Error(err.error);
      }
      toast.success("Comprovante anexado.");
      utils.ledgerCharges.list.invalidate();
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar comprovante.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
      {charge.comprovanteUrl && (
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" title="Ver comprovante" onClick={() => window.open(charge.comprovanteUrl!, "_blank", "noopener,noreferrer")}>
          <ExternalLink className="h-3 w-3" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-primary"
        disabled={enviando}
        title={charge.comprovanteUrl ? "Substituir comprovante" : "Anexar comprovante"}
        onClick={() => inputRef.current?.click()}
      >
        {enviando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
      </Button>
    </>
  );
}

function BaixaDialog({ charge, onOpenChange }: { charge: Charge | null; onOpenChange: (open: boolean) => void }) {
  const utils = trpc.useUtils();
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const chargeIdRef = useRef<number | null>(null);

  if (charge && chargeIdRef.current !== charge.id) {
    chargeIdRef.current = charge.id;
    setValor(String(Number(charge.valor)));
    setData(new Date().toISOString().slice(0, 10));
  }
  if (!charge && chargeIdRef.current !== null) chargeIdRef.current = null;

  const pagar = trpc.ledgerCharges.pagar.useMutation({
    onSuccess: () => { utils.ledgerCharges.list.invalidate(); onOpenChange(false); toast.success("Baixa confirmada."); },
    onError: (e) => toast.error(e.message),
  });

  const confirmar = () => {
    if (!charge) return;
    const v = Number(valor);
    if (!v || v <= 0) { toast.error("Informe o valor."); return; }
    if (!data) { toast.error("Informe a data."); return; }
    pagar.mutate({ id: charge.id, valorPago: v, dataPagamento: data });
  };

  const entrada = charge?.grupo === "receita";

  return (
    <Dialog open={charge !== null} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">{entrada ? "Marcar como recebido" : "Dar baixa"}</DialogTitle>
        </DialogHeader>
        {charge && (
          <div className="grid gap-3 py-2">
            <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2">
              <p className="text-sm font-medium">{charge.descricao || charge.categoria}</p>
              <p className="text-xs text-muted-foreground">Vencimento {formatDate(charge.dataVencimento)} · Previsto {brl(charge.valor)}</p>
            </div>
            <div className="grid gap-1.5">
              <Label>{entrada ? "Valor recebido (R$)" : "Valor pago (R$)"}</Label>
              <Input autoFocus value={valor} onChange={(e) => setValor(e.target.value)} type="number" step="0.01" min="0" />
            </div>
            <div className="grid gap-1.5">
              <Label>Data</Label>
              <DateInput value={data} onChange={setData} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" className="bg-background" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={pagar.isPending}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
