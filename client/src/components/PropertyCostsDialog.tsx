import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { brl, formatCompetencia } from "@/lib/format";

type Tipo = "condominio" | "iptu" | "condominio_extra";

const TIPO_LABELS: Record<Tipo, string> = {
  condominio: "Condomínio (mensal)",
  iptu: "IPTU (anual)",
  condominio_extra: "Rateio extraordinário",
};

const competenciaAtual = () => new Date().toISOString().slice(0, 7);

interface Props {
  propertyId: number;
  apelido: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Condomínio, IPTU e rateios de um imóvel.
 *
 * Aqui fica só o VALOR. Quem paga é decidido no contrato de locação, porque varia de inquilino
 * para inquilino — a exceção são os rateios extraordinários, negociados caso a caso e por isso
 * com responsável próprio.
 */
export default function PropertyCostsDialog({ propertyId, apelido, open, onOpenChange }: Props) {
  const utils = trpc.useUtils();
  const { data: custos, isLoading } = trpc.propertyCosts.list.useQuery({ propertyId }, { enabled: open });

  const [tipo, setTipo] = useState<Tipo>("condominio");
  const [valor, setValor] = useState("");
  const [competenciaInicio, setCompetenciaInicio] = useState(competenciaAtual());
  const [qtdMeses, setQtdMeses] = useState("12");
  const [dia, setDia] = useState("10");
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState<"proprietario" | "inquilino">("proprietario");

  const limpar = () => {
    setValor("");
    setDescricao("");
    setCompetenciaInicio(competenciaAtual());
    setQtdMeses(tipo === "iptu" ? "10" : "12");
  };

  const create = trpc.propertyCosts.create.useMutation({
    onSuccess: () => {
      utils.propertyCosts.list.invalidate({ propertyId });
      utils.ledgerEntries.list.invalidate();
      utils.longTermContracts.charges.invalidate();
      toast.success("Custo cadastrado.");
      limpar();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.propertyCosts.delete.useMutation({
    onSuccess: () => {
      utils.propertyCosts.list.invalidate({ propertyId });
      utils.ledgerEntries.list.invalidate();
      utils.longTermContracts.charges.invalidate();
      toast.success("Custo removido.");
    },
    onError: (e) => toast.error(e.message),
  });

  const trocarTipo = (novo: Tipo) => {
    setTipo(novo);
    setQtdMeses(novo === "iptu" ? "10" : novo === "condominio_extra" ? "1" : "12");
  };

  const salvar = () => {
    const v = Number(valor);
    if (!v || v <= 0) { toast.error("Informe o valor."); return; }
    if (!/^\d{4}-\d{2}$/.test(competenciaInicio)) { toast.error("Informe a competência inicial."); return; }
    const qtd = tipo === "condominio_extra" ? 1 : Number(qtdMeses) || 1;
    if (tipo === "iptu" && qtd !== 1 && qtd !== 10) { toast.error("O IPTU deve ser à vista (1) ou em 10 parcelas."); return; }
    create.mutate({
      propertyId,
      tipo,
      valor: v,
      competenciaInicio,
      qtdMeses: qtd,
      dia: Number(dia) || 10,
      descricao: descricao || undefined,
      responsavel: tipo === "condominio_extra" ? responsavel : undefined,
    });
  };

  const ordenados = useMemo(
    () => [...(custos ?? [])].sort((a, b) => b.competenciaInicio.localeCompare(a.competenciaInicio)),
    [custos],
  );

  const fimDaSerie = (competenciaInicio: string, qtdMeses: number) => {
    const [y, m] = competenciaInicio.split("-").map(Number);
    const total = y * 12 + (m - 1) + qtdMeses - 1;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Condomínio e IPTU — {apelido}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Cadastre aqui só o valor. Quem paga é definido no contrato de locação, e pode mudar a cada inquilino. Sem
          contrato vigente, o custo é do proprietário e entra na DRE dele.
        </p>

        <div className="rounded-md border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => trocarTipo(v as Tipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">{tipo === "iptu" ? "Valor total do ano (R$)" : "Valor (R$)"}</Label>
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">A partir da competência</Label>
              <Input type="month" value={competenciaInicio} onChange={(e) => setCompetenciaInicio(e.target.value)} />
            </div>
            {tipo === "iptu" ? (
              <div className="grid gap-1.5">
                <Label className="text-xs">Parcelamento</Label>
                <Select value={qtdMeses} onValueChange={setQtdMeses}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">À vista (1 parcela)</SelectItem>
                    <SelectItem value="10">10 parcelas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : tipo === "condominio" ? (
              <div className="grid gap-1.5">
                <Label className="text-xs">Vigência (meses)</Label>
                <Input type="number" min={1} value={qtdMeses} onChange={(e) => setQtdMeses(e.target.value)} />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label className="text-xs">Quem paga este rateio</Label>
                <Select value={responsavel} onValueChange={(v) => setResponsavel(v as "proprietario" | "inquilino")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprietario">Proprietário</SelectItem>
                    <SelectItem value="inquilino">Inquilino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label className="text-xs">Dia de vencimento</Label>
              <Input type="number" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} />
            </div>
            {tipo === "condominio_extra" && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Descrição</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Rateio de obra da fachada" />
              </div>
            )}
          </div>

          {tipo === "condominio" && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Um valor novo de condomínio encerra o anterior na competência informada, em vez de substituí-lo — assim a
              DRE dos meses já fechados continua usando o valor que valia na época.
            </p>
          )}
          {tipo === "iptu" && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Informe o total do ano; o sistema divide pelo parcelamento escolhido e lança a parcela mês a mês.
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={salvar} disabled={create.isPending}>
              {create.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : ordenados.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum custo cadastrado para este imóvel.</p>
          ) : (
            <ul className="divide-y divide-border">
              {ordenados.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {c.tipo === "condominio_extra" ? c.descricao || "Rateio extraordinário" : TIPO_LABELS[c.tipo as Tipo]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCompetencia(c.competenciaInicio)}
                      {c.qtdMeses > 1 ? ` até ${formatCompetencia(fimDaSerie(c.competenciaInicio, c.qtdMeses))}` : ""}
                      {c.qtdMeses > 1 ? ` · ${c.qtdMeses} parcelas` : ""}
                      {c.tipo === "condominio_extra" && c.responsavel === "inquilino" ? " · pago pelo inquilino" : ""}
                      {c.qtdMeses === 0 ? " · encerrado" : ""}
                    </p>
                  </div>
                  <span className="tabular-nums text-sm font-medium shrink-0">{brl(c.valor)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => remove.mutate({ id: c.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
