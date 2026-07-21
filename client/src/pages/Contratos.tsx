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
import { Plus, Trash2, FileText, CheckCircle2, Circle, User } from "lucide-react";
import { brl, formatDate } from "@/lib/format";
import { PageHeader, EmptyState, SkeletonList } from "./Clientes";
import MarcarRecebidoDialog from "@/components/MarcarRecebidoDialog";

interface ContractForm {
  propertyId: string;
  dataInicio: string;
  prazoMeses: string;
  diaVencimentoAluguel: string;
  indiceCorrecao: string;
  carenciaInicio: string;
  carenciaFim: string;
  valorAluguel: string;
  nomeInquilino: string;
  cpfCnpjInquilino: string;
  contatoInquilino: string;
  telefoneInquilino: string;
  celularInquilino: string;
  whatsappInquilino: string;
  emailInquilino: string;
  tipoGarantia: string;
  comissaoPct: string;
  tipoAdministracao: "propria" | "administradora" | "gestor_curta_temporada";
}

const emptyForm: ContractForm = {
  propertyId: "", dataInicio: "", prazoMeses: "12", diaVencimentoAluguel: "10",
  indiceCorrecao: "IGPM", carenciaInicio: "", carenciaFim: "", valorAluguel: "",
  nomeInquilino: "", cpfCnpjInquilino: "", contatoInquilino: "", telefoneInquilino: "", celularInquilino: "",
  whatsappInquilino: "", emailInquilino: "", tipoGarantia: "", comissaoPct: "0", tipoAdministracao: "propria",
};

const TIPO_ADMIN_LABELS_CONTRATO: Record<ContractForm["tipoAdministracao"], string> = {
  propria: "Direta (proprietário)",
  administradora: "Administradora",
  gestor_curta_temporada: "Gestor de temporada terceirizado",
};

/** Soma meses a uma data "AAAA-MM-DD", preservando o dia (ajustado para o fim do mês se necessário) */
function addMonthsToDate(data: string, months: number): string {
  const [y, m, d] = data.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const ultimoDiaDoMes = new Date(ny, nm, 0).getDate();
  const diaAjustado = Math.min(d, ultimoDiaDoMes);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(diaAjustado).padStart(2, "0")}`;
}

export default function Contratos() {
  const utils = trpc.useUtils();
  const { data: imoveis } = trpc.properties.list.useQuery();
  const [propertyId, setPropertyId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ContractForm>(emptyForm);
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [recebendo, setRecebendo] = useState<{ id: number; valor: number } | null>(null);

  const longTermProps = useMemo(() => (imoveis ?? []).filter((p) => p.tipoLocacao === "longa"), [imoveis]);

  const { data: contratos, isLoading } = trpc.longTermContracts.list.useQuery(
    { propertyId: propertyId ? Number(propertyId) : undefined },
    { enabled: true },
  );

  // Todos os contratos (sem filtro de imóvel), usado para saber quais imóveis já têm contrato.
  const { data: todosContratos } = trpc.longTermContracts.list.useQuery({});
  const imoveisComContrato = useMemo(() => new Set((todosContratos ?? []).map((c) => c.propertyId)), [todosContratos]);
  const imoveisSemContrato = useMemo(() => longTermProps.filter((p) => !imoveisComContrato.has(p.id)), [longTermProps, imoveisComContrato]);

  const { data: charges } = trpc.longTermContracts.charges.useQuery(
    { contractId: selectedContractId ?? undefined },
    { enabled: !!selectedContractId },
  );

  const { data: garantias } = trpc.guaranteeTypes.list.useQuery();

  const reset = () => setForm(emptyForm);

  const create = trpc.longTermContracts.create.useMutation({
    onSuccess: () => { utils.longTermContracts.list.invalidate(); setOpen(false); reset(); toast.success("Contrato cadastrado."); },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.longTermContracts.delete.useMutation({
    onSuccess: () => { utils.longTermContracts.list.invalidate(); setSelectedContractId(null); toast.success("Contrato removido."); },
    onError: (e) => toast.error(e.message),
  });

  const markPending = trpc.longTermContracts.markPending.useMutation({
    onSuccess: () => { utils.longTermContracts.charges.invalidate(); toast.success("Parcela marcada como pendente."); },
    onError: (e) => toast.error(e.message),
  });

  const deleteCharge = trpc.longTermContracts.deleteCharge.useMutation({
    onSuccess: () => { utils.longTermContracts.charges.invalidate(); toast.success("Parcela removida."); },
    onError: (e) => toast.error(e.message),
  });

  const prazoMesesNum = Number(form.prazoMeses) || 12;
  const dataFimCalculada = form.dataInicio ? addMonthsToDate(form.dataInicio, prazoMesesNum) : "";
  const dataReajusteCalculada = form.dataInicio ? addMonthsToDate(form.dataInicio, 12) : "";

  const submit = () => {
    if (!form.propertyId) { toast.error("Selecione o imóvel."); return; }
    if (!form.dataInicio) { toast.error("Informe a data de início do contrato."); return; }
    const valor = Number(form.valorAluguel);
    if (!valor || valor <= 0) { toast.error("Informe o valor do aluguel."); return; }
    create.mutate({
      propertyId: Number(form.propertyId),
      dataInicio: form.dataInicio,
      indiceCorrecao: form.indiceCorrecao || "IGPM",
      prazoMeses: prazoMesesNum,
      diaVencimentoAluguel: Number(form.diaVencimentoAluguel) || 10,
      valorAluguel: valor,
      carenciaInicio: form.carenciaInicio || undefined,
      carenciaFim: form.carenciaFim || undefined,
      nomeInquilino: form.nomeInquilino || undefined,
      cpfCnpjInquilino: form.cpfCnpjInquilino || undefined,
      contatoInquilino: form.contatoInquilino || undefined,
      telefoneInquilino: form.telefoneInquilino || undefined,
      celularInquilino: form.celularInquilino || undefined,
      whatsappInquilino: form.whatsappInquilino || undefined,
      emailInquilino: form.emailInquilino || undefined,
      tipoGarantia: form.tipoGarantia || undefined,
      comissaoPct: form.tipoAdministracao === "propria" ? 0 : Number(form.comissaoPct) || 0,
      tipoAdministracao: form.tipoAdministracao,
    });
  };

  const nomeImovel = (id: number) => imoveis?.find((p) => p.id === id)?.apelido ?? "—";
  const selectedContract = contratos?.find((c) => c.id === selectedContractId);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Contratos de Longa Duração"
        subtitle="Inquilinos, vigência e recebíveis de aluguel para imóveis de longa duração."
        action={
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="active:scale-[0.97] transition-transform" disabled={!imoveisSemContrato.length}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Novo contrato
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-serif">Novo contrato</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-1.5">
                    <Label>Imóvel</Label>
                    <Select value={form.propertyId} onValueChange={(v) => setForm({ ...form, propertyId: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o imóvel de longa duração" /></SelectTrigger>
                      <SelectContent>
                        {imoveisSemContrato.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.apelido}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!longTermProps.length ? (
                      <p className="text-xs text-amber-600">Nenhum imóvel marcado como "Longa duração". Ajuste o tipo de locação em Imóveis.</p>
                    ) : !imoveisSemContrato.length ? (
                      <p className="text-xs text-amber-600">Todos os imóveis de longa duração já têm contrato cadastrado.</p>
                    ) : null}
                  </div>

                  <div className={form.tipoAdministracao === "propria" ? "grid gap-1.5" : "grid grid-cols-2 gap-3"}>
                    <div className="grid gap-1.5">
                      <Label>Administração</Label>
                      <Select
                        value={form.tipoAdministracao}
                        onValueChange={(v) => setForm({ ...form, tipoAdministracao: v as ContractForm["tipoAdministracao"], ...(v === "propria" ? { comissaoPct: "0" } : {}) })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(TIPO_ADMIN_LABELS_CONTRATO) as ContractForm["tipoAdministracao"][]).map((k) => (
                            <SelectItem key={k} value={k}>{TIPO_ADMIN_LABELS_CONTRATO[k]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.tipoAdministracao !== "propria" && (
                      <div className="grid gap-1.5">
                        <Label>Comissão (%)</Label>
                        <Input value={form.comissaoPct} onChange={(e) => setForm({ ...form, comissaoPct: e.target.value })} type="number" step="0.01" min="0" max="100" />
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/50 p-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4 text-primary" /> Inquilino
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Nome</Label>
                        <Input value={form.nomeInquilino} onChange={(e) => setForm({ ...form, nomeInquilino: e.target.value })} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">CPF/CNPJ</Label>
                        <Input value={form.cpfCnpjInquilino} onChange={(e) => setForm({ ...form, cpfCnpjInquilino: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Telefone</Label>
                        <Input value={form.telefoneInquilino} onChange={(e) => setForm({ ...form, telefoneInquilino: e.target.value })} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">WhatsApp</Label>
                        <Input value={form.whatsappInquilino} onChange={(e) => setForm({ ...form, whatsappInquilino: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">E-mail</Label>
                      <Input value={form.emailInquilino} onChange={(e) => setForm({ ...form, emailInquilino: e.target.value })} type="email" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Início do contrato</Label>
                      <Input value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} type="date" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Prazo (meses)</Label>
                      <Input value={form.prazoMeses} onChange={(e) => setForm({ ...form, prazoMeses: e.target.value })} type="number" min="1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Fim do contrato</Label>
                      <Input value={form.dataInicio ? formatDate(dataFimCalculada) : ""} disabled placeholder="Calculado a partir do início + prazo" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Próximo reajuste</Label>
                      <Input value={form.dataInicio ? formatDate(dataReajusteCalculada) : ""} disabled placeholder="Calculado (início + 12 meses)" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Carência (início)</Label>
                      <Input value={form.carenciaInicio} onChange={(e) => setForm({ ...form, carenciaInicio: e.target.value })} type="date" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Carência (fim)</Label>
                      <Input value={form.carenciaFim} onChange={(e) => setForm({ ...form, carenciaFim: e.target.value })} type="date" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Valor do aluguel (R$)</Label>
                      <Input value={form.valorAluguel} onChange={(e) => setForm({ ...form, valorAluguel: e.target.value })} type="number" step="0.01" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Dia de vencimento</Label>
                      <Input value={form.diaVencimentoAluguel} onChange={(e) => setForm({ ...form, diaVencimentoAluguel: e.target.value })} type="number" min="1" max="31" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Índice de correção</Label>
                      <Select value={form.indiceCorrecao} onValueChange={(v) => setForm({ ...form, indiceCorrecao: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IGPM">IGP-M</SelectItem>
                          <SelectItem value="IPCA">IPCA</SelectItem>
                          <SelectItem value="INPC">INPC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Tipo de garantia</Label>
                      <Select value={form.tipoGarantia} onValueChange={(v) => setForm({ ...form, tipoGarantia: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {(garantias ?? []).filter((g) => g.ativa === 1).map((g) => (
                            <SelectItem key={g.id} value={g.nome}>{g.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="bg-background" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={submit} disabled={create.isPending}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="mb-6 flex items-center gap-3">
        <Select value={propertyId || "all"} onValueChange={(v) => setPropertyId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[240px] bg-card">
            <SelectValue placeholder="Todos os imóveis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os imóveis</SelectItem>
            {longTermProps.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.apelido}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SkeletonList />
      ) : !contratos?.length ? (
        <EmptyState title="Nenhum contrato cadastrado" subtitle="Cadastre o primeiro contrato de longa duração." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <Card className="overflow-hidden py-0">
            <div className="divide-y divide-border">
              {contratos.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selectedContractId === c.id ? "bg-primary/5" : "hover:bg-secondary/40"}`}
                  onClick={() => setSelectedContractId(c.id)}
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{nomeImovel(c.propertyId)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.nomeInquilino || "Inquilino não informado"} · {formatDate(c.dataInicio)}–{formatDate(c.dataFim)} · {c.indiceCorrecao}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => { e.stopPropagation(); del.mutate({ id: c.id }); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <div>
            {!selectedContract ? (
              <EmptyState title="Selecione um contrato" subtitle="Veja o cronograma de recebíveis do contrato selecionado." />
            ) : (
              <Card className="overflow-hidden py-0">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium">{selectedContract.nomeInquilino || "Inquilino"}</p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento todo dia {selectedContract.diaVencimentoAluguel} · {nomeImovel(selectedContract.propertyId)}
                    {selectedContract.tipoGarantia ? ` · Garantia: ${selectedContract.tipoGarantia}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {TIPO_ADMIN_LABELS_CONTRATO[selectedContract.tipoAdministracao as ContractForm["tipoAdministracao"]]}
                    {Number(selectedContract.comissaoPct) > 0 ? ` · Comissão ${Number(selectedContract.comissaoPct)}%` : ""}
                  </p>
                </div>
                <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                  {!charges?.length ? (
                    <div className="p-4 text-sm text-muted-foreground">Nenhuma parcela gerada.</div>
                  ) : (
                    charges.map((ch) => {
                      const multa = Number(ch.multaJuros ?? 0);
                      const desconto = Number(ch.desconto ?? 0);
                      return (
                        <div key={ch.id} className="group flex items-center justify-between px-4 py-2 hover:bg-secondary/40 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <button onClick={() => (ch.status === "recebido" ? markPending.mutate({ id: ch.id }) : setRecebendo({ id: ch.id, valor: Number(ch.valor) }))}>
                              {ch.status === "recebido" ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            <div>
                              <p className="text-sm font-medium">{ch.competencia}</p>
                              <p className="text-xs text-muted-foreground">
                                Vence {formatDate(ch.dataVencimento)}
                                {ch.dataRecebimento ? ` · Recebido ${formatDate(ch.dataRecebimento)}` : ""}
                              </p>
                              {ch.status === "recebido" && (multa > 0 || desconto > 0) && (
                                <p className="text-[11px]">
                                  {multa > 0 && <span className="text-primary">+{brl(multa)} multa/juros</span>}
                                  {multa > 0 && desconto > 0 && " · "}
                                  {desconto > 0 && <span className="text-destructive">-{brl(desconto)} desconto</span>}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums text-sm font-medium">{brl(ch.status === "recebido" ? (ch.valorRecebido ?? ch.valor) : ch.valor)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" onClick={() => deleteCharge.mutate({ id: ch.id })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      <MarcarRecebidoDialog
        chargeId={recebendo?.id ?? null}
        valorOriginal={recebendo?.valor ?? 0}
        onOpenChange={(o) => !o && setRecebendo(null)}
        onSuccess={() => { utils.longTermContracts.charges.invalidate(); setRecebendo(null); }}
      />
    </div>
  );
}
