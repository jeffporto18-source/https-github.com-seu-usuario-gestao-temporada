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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Settings } from "lucide-react";
import { brl } from "@/lib/format";

interface MarcarRecebidoDialogProps {
  chargeId: number | null;
  valorOriginal: number;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/** Diálogo compartilhado para marcar um aluguel como recebido, com multa/juros e desconto (vira despesa). */
export default function MarcarRecebidoDialog({ chargeId, valorOriginal, onOpenChange, onSuccess }: MarcarRecebidoDialogProps) {
  const utils = trpc.useUtils();
  const { data: categorias } = trpc.expenseCategories.list.useQuery();
  const [dataRecebimento, setDataRecebimento] = useState("");
  const [multaJuros, setMultaJuros] = useState("0");
  const [desconto, setDesconto] = useState("0");
  const [categoriaId, setCategoriaId] = useState("");
  const [descontoDescricao, setDescontoDescricao] = useState("");
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  useEffect(() => {
    if (chargeId !== null) {
      setDataRecebimento(new Date().toISOString().slice(0, 10));
      setMultaJuros("0");
      setDesconto("0");
      setCategoriaId("");
      setDescontoDescricao("");
    }
  }, [chargeId]);

  const markReceived = trpc.longTermContracts.markReceived.useMutation({
    onSuccess: () => { toast.success("Aluguel marcado como recebido."); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const createCat = trpc.expenseCategories.create.useMutation({
    onSuccess: () => { utils.expenseCategories.list.invalidate(); setNewCatName(""); toast.success("Categoria criada."); },
    onError: (e) => toast.error(e.message),
  });

  const updateCat = trpc.expenseCategories.update.useMutation({
    onSuccess: () => { utils.expenseCategories.list.invalidate(); setEditingCatId(null); setEditingCatName(""); toast.success("Categoria atualizada."); },
    onError: (e) => toast.error(e.message),
  });

  const deleteCat = trpc.expenseCategories.delete.useMutation({
    onSuccess: () => { utils.expenseCategories.list.invalidate(); toast.success("Categoria removida."); },
    onError: (e) => toast.error(e.message),
  });

  const valorMulta = Number(multaJuros) || 0;
  const valorDesconto = Number(desconto) || 0;
  const valorAReceber = valorOriginal + valorMulta - valorDesconto;
  const activeCategorias = (categorias ?? []).filter((c) => c.ativa === 1);

  const confirmar = () => {
    if (chargeId === null) return;
    markReceived.mutate({
      id: chargeId,
      dataRecebimento: dataRecebimento || undefined,
      multaJuros: valorMulta,
      desconto: valorDesconto,
      descontoCategoriaId: valorDesconto > 0 ? Number(categoriaId) : undefined,
      descontoDescricao: valorDesconto > 0 ? descontoDescricao || undefined : undefined,
    });
  };

  return (
    <>
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
                    <TabsTrigger value="categorias" className="flex-1">Categorias</TabsTrigger>
                  </TabsList>
                  <TabsContent value="descrever" className="pt-2">
                    <Input
                      placeholder="Ex.: cortesia por atraso na manutenção..."
                      value={descontoDescricao}
                      onChange={(e) => setDescontoDescricao(e.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="categorias" className="pt-2 space-y-2">
                    <div className="flex gap-2">
                      <Select value={categoriaId} onValueChange={setCategoriaId}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {activeCategorias.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" className="bg-background shrink-0" onClick={() => setCatDialogOpen(true)} title="Gerenciar categorias">
                        <Settings className="h-4 w-4" />
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

      {/* Gerenciamento de categorias de despesa (mesmo padrão da tela Despesas) */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Gerenciar categorias</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-64 overflow-y-auto">
            {(categorias ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                {editingCatId === c.id ? (
                  <Input
                    className="h-7 text-sm flex-1 mr-2"
                    value={editingCatName}
                    onChange={(e) => setEditingCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && editingCatName.trim()) updateCat.mutate({ id: c.id, nome: editingCatName.trim() }); if (e.key === "Escape") { setEditingCatId(null); setEditingCatName(""); } }}
                    autoFocus
                  />
                ) : (
                  <span className="text-sm font-medium cursor-pointer hover:text-primary" onClick={() => { setEditingCatId(c.id); setEditingCatName(c.nome); }}>{c.nome}</span>
                )}
                <div className="flex gap-1">
                  {editingCatId === c.id ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" disabled={!editingCatName.trim()} onClick={() => updateCat.mutate({ id: c.id, nome: editingCatName.trim() })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteCat.mutate({ id: c.id })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input placeholder="Nova categoria..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newCatName.trim()) createCat.mutate({ nome: newCatName.trim() }); }} />
            <Button size="sm" disabled={!newCatName.trim() || createCat.isPending} onClick={() => createCat.mutate({ nome: newCatName.trim() })}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
