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
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Settings } from "lucide-react";
import { brl } from "@/lib/format";
import { Link } from "wouter";

interface MarcarRecebidoDialogProps {
  chargeId: number | null;
  valorOriginal: number;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/** Diálogo compartilhado para marcar um aluguel como recebido, com multa/juros e desconto (vira despesa). */
export default function MarcarRecebidoDialog({ chargeId, valorOriginal, onOpenChange, onSuccess }: MarcarRecebidoDialogProps) {
  const { data: contasFixas } = trpc.chartAccounts.list.useQuery({ grupo: "despesa_fixa" });
  const { data: contasVariaveis } = trpc.chartAccounts.list.useQuery({ grupo: "despesa_variavel" });
  const [dataRecebimento, setDataRecebimento] = useState("");
  const [multaJuros, setMultaJuros] = useState("0");
  const [desconto, setDesconto] = useState("0");
  const [chartAccountId, setChartAccountId] = useState("");
  const [descontoDescricao, setDescontoDescricao] = useState("");

  useEffect(() => {
    if (chargeId !== null) {
      setDataRecebimento(new Date().toISOString().slice(0, 10));
      setMultaJuros("0");
      setDesconto("0");
      setChartAccountId("");
      setDescontoDescricao("");
    }
  }, [chargeId]);

  const markReceived = trpc.longTermContracts.markReceived.useMutation({
    onSuccess: () => { toast.success("Aluguel marcado como recebido."); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const valorMulta = Number(multaJuros) || 0;
  const valorDesconto = Number(desconto) || 0;
  const valorAReceber = valorOriginal + valorMulta - valorDesconto;

  // Contas de despesa (fixas e variáveis), com sub-contas indentadas (profundidade livre).
  const contasOrdenadas = useMemo(() => {
    const todas = [...(contasFixas ?? []), ...(contasVariaveis ?? [])].filter((c) => c.ativa === 1);
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
  }, [contasFixas, contasVariaveis]);

  const confirmar = () => {
    if (chargeId === null) return;
    markReceived.mutate({
      id: chargeId,
      dataRecebimento: dataRecebimento || undefined,
      multaJuros: valorMulta,
      desconto: valorDesconto,
      descontoChartAccountId: valorDesconto > 0 && chartAccountId ? Number(chartAccountId) : undefined,
      descontoDescricao: valorDesconto > 0 ? descontoDescricao || undefined : undefined,
    });
  };

  return (
    <Dialog open={chargeId !== null} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Marcar como recebido</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Data de recebimento</Label>
            <Input value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} type="date" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Multa/juros por atraso (R$)</Label>
              <Input value={multaJuros} onChange={(e) => setMultaJuros(e.target.value)} type="number" step="0.01" min="0" />
            </div>
            <div className="grid gap-1.5">
              <Label>Desconto concedido (R$)</Label>
              <Input value={desconto} onChange={(e) => setDesconto(e.target.value)} type="number" step="0.01" min="0" />
            </div>
          </div>

          {valorDesconto > 0 && (
            <div className="grid gap-1.5">
              <Label>Classificação do desconto</Label>
              <Tabs defaultValue="descrever">
                <TabsList className="w-full">
                  <TabsTrigger value="descrever" className="flex-1">Descrever</TabsTrigger>
                  <TabsTrigger value="conta" className="flex-1">Conta</TabsTrigger>
                </TabsList>
                <TabsContent value="descrever" className="pt-2">
                  <Input
                    placeholder="Ex.: cortesia por atraso na manutenção..."
                    value={descontoDescricao}
                    onChange={(e) => setDescontoDescricao(e.target.value)}
                  />
                </TabsContent>
                <TabsContent value="conta" className="pt-2 space-y-2">
                  <div className="flex gap-2">
                    <Select value={chartAccountId} onValueChange={setChartAccountId}>
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
                </TabsContent>
              </Tabs>
              <p className="text-xs text-muted-foreground">O desconto é lançado automaticamente como despesa do imóvel.</p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor a receber</span>
            <span className="tabular-nums font-serif font-semibold text-primary">{brl(valorAReceber)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="bg-background" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={markReceived.isPending}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
