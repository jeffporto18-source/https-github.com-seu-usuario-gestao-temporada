import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { PageHeader } from "./Clientes";
import { brl } from "@/lib/format";

interface CsvRow {
  codigo: string;
  valorBruto: number;
  taxaLimpeza: number;
  taxaAirbnbPct: number;
  checkin: string;
  checkout: string;
  noites: number;
  faxinasUtilizadas: number;
}

// Mapeamento flexível de colunas do CSV do Airbnb
const COLUMN_MAP: Record<string, keyof CsvRow> = {
  // Código da reserva
  "confirmation code": "codigo",
  "código de confirmação": "codigo",
  "codigo de confirmacao": "codigo",
  "código": "codigo",
  "codigo": "codigo",
  "reservation code": "codigo",
  // Valor bruto
  "amount": "valorBruto",
  "gross earnings": "valorBruto",
  "earnings": "valorBruto",
  "valor bruto": "valorBruto",
  "valor": "valorBruto",
  "total": "valorBruto",
  "payout": "valorBruto",
  "guest paid": "valorBruto",
  // Taxa de limpeza
  "cleaning fee": "taxaLimpeza",
  "taxa de limpeza": "taxaLimpeza",
  "limpeza": "taxaLimpeza",
  // Check-in
  "start date": "checkin",
  "check-in": "checkin",
  "checkin": "checkin",
  "data de entrada": "checkin",
  "início": "checkin",
  "inicio": "checkin",
  // Check-out
  "end date": "checkout",
  "check-out": "checkout",
  "checkout": "checkout",
  "data de saída": "checkout",
  "data de saida": "checkout",
  "fim": "checkout",
  // Noites
  "nights": "noites",
  "noites": "noites",
  "# of nights": "noites",
};

function parseDate(val: string): string | null {
  if (!val) return null;
  // Tenta formatos comuns: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  const usMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (usMatch) return `${usMatch[3]}-${usMatch[1]}-${usMatch[2]}`;
  // Tenta Date nativo
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseCurrency(val: string): number {
  if (!val) return 0;
  // Remove R$, $, espaços, pontos de milhar, troca vírgula por ponto
  const cleaned = val.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.abs(n);
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows = lines.slice(1).map((line) =>
    line.split(sep).map((cell) => cell.trim().replace(/^"|"$/g, "")),
  );
  return { headers, rows };
}

function mapRow(headers: string[], row: string[], defaultFaxinas: number): CsvRow | null {
  const mapped: Partial<CsvRow> = { taxaAirbnbPct: 4, taxaLimpeza: 0, faxinasUtilizadas: defaultFaxinas };

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const field = COLUMN_MAP[h];
    if (!field) continue;
    const val = row[i] || "";

    switch (field) {
      case "codigo":
        mapped.codigo = val;
        break;
      case "valorBruto":
        mapped.valorBruto = parseCurrency(val);
        break;
      case "taxaLimpeza":
        mapped.taxaLimpeza = parseCurrency(val);
        break;
      case "checkin":
        mapped.checkin = parseDate(val) || "";
        break;
      case "checkout":
        mapped.checkout = parseDate(val) || "";
        break;
      case "noites":
        mapped.noites = parseInt(val) || 0;
        break;
    }
  }

  // Validação mínima
  if (!mapped.codigo || !mapped.checkin || !mapped.checkout) return null;
  if (!mapped.valorBruto || mapped.valorBruto <= 0) return null;

  // Calcular noites se não veio no CSV
  if (!mapped.noites || mapped.noites <= 0) {
    const diff = Math.round(
      (new Date(mapped.checkout).getTime() - new Date(mapped.checkin).getTime()) / 86400000,
    );
    mapped.noites = Math.max(1, diff);
  }

  return mapped as CsvRow;
}

export default function ImportarCsv() {
  const utils = trpc.useUtils();
  const { data: todosImoveis } = trpc.properties.list.useQuery();
  const imoveis = useMemo(() => (todosImoveis ?? []).filter((p) => p.tipoLocacao === "curta"), [todosImoveis]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [faxinasPadrao, setFaxinasPadrao] = useState("1");
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const importMut = trpc.reservations.importCsv.useMutation({
    onSuccess: (res) => {
      utils.reservations.list.invalidate();
      utils.ledgerEntries.list.invalidate();
      toast.success(`${res.importadas} reserva(s) importada(s) com sucesso!`);
      setParsedRows([]);
      setFileName("");
      setErrors([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCsv(text);

      if (!headers.length) {
        setErrors(["Arquivo vazio ou formato inválido."]);
        setParsedRows([]);
        return;
      }

      const errs: string[] = [];
      const mapped: CsvRow[] = [];
      const defaultFax = Number(faxinasPadrao) || 1;

      for (let i = 0; i < rows.length; i++) {
        const row = mapRow(headers, rows[i], defaultFax);
        if (row) {
          mapped.push(row);
        } else {
          errs.push(`Linha ${i + 2}: dados insuficientes (código, datas ou valor ausentes)`);
        }
      }

      setParsedRows(mapped);
      setErrors(errs);
    };
    reader.readAsText(file, "utf-8");
  };

  const submit = () => {
    if (!propertyId) {
      toast.error("Selecione o imóvel de destino.");
      return;
    }
    if (!parsedRows.length) {
      toast.error("Nenhuma reserva válida para importar.");
      return;
    }
    importMut.mutate({ propertyId: Number(propertyId), rows: parsedRows });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Importar CSV"
        subtitle="Importe reservas do relatório de ganhos/pagamentos do Airbnb em lote."
      />

      <Card className="p-6 space-y-5">
        {/* Seleção de imóvel */}
        <div className="grid gap-1.5 max-w-sm">
          <Label>Imóvel de destino</Label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger><SelectValue placeholder="Selecione o imóvel" /></SelectTrigger>
            <SelectContent>
              {imoveis?.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.apelido}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Faxinas padrão */}
        <div className="grid gap-1.5 max-w-xs">
          <Label>Faxinas por reserva (padrão)</Label>
          <Input
            value={faxinasPadrao}
            onChange={(e) => setFaxinasPadrao(e.target.value)}
            type="number"
            min="0"
            step="1"
          />
          <p className="text-xs text-muted-foreground">
            Quantidade de faxinas a atribuir para cada reserva importada.
          </p>
        </div>

        {/* Upload */}
        <div className="grid gap-1.5">
          <Label>Arquivo CSV</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="bg-background"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" /> Selecionar arquivo
            </Button>
            {fileName && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" /> {fileName}
              </span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFile}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Aceita o CSV exportado do Airbnb (Earnings → Paid → Get report). Separador: vírgula ou ponto-e-vírgula.
            Colunas reconhecidas: Confirmation Code, Start Date, End Date, Amount, Cleaning Fee, Nights.
          </p>
        </div>

        {/* Erros */}
        {errors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-1">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> {errors.length} linha(s) ignorada(s)
            </p>
            <ul className="text-xs text-amber-700 list-disc list-inside max-h-32 overflow-auto">
              {errors.slice(0, 10).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {errors.length > 10 && <li>... e mais {errors.length - 10}</li>}
            </ul>
          </div>
        )}

        {/* Preview */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary">
                <CheckCircle2 className="mr-1 h-3 w-3" /> {parsedRows.length} reserva(s) prontas
              </Badge>
            </div>
            <div className="overflow-auto max-h-64 rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Código</th>
                    <th className="px-3 py-2 text-left font-medium">Check-in</th>
                    <th className="px-3 py-2 text-left font-medium">Check-out</th>
                    <th className="px-3 py-2 text-right font-medium">Noites</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-3 py-2 text-right font-medium">Limpeza</th>
                    <th className="px-3 py-2 text-right font-medium">Faxinas</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{r.codigo}</td>
                      <td className="px-3 py-2">{r.checkin}</td>
                      <td className="px-3 py-2">{r.checkout}</td>
                      <td className="px-3 py-2 text-right">{r.noites}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{brl(r.valorBruto)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{brl(r.taxaLimpeza)}</td>
                      <td className="px-3 py-2 text-right">{r.faxinasUtilizadas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Mostrando 50 de {parsedRows.length} linhas...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Botão de importar */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={submit}
            disabled={!parsedRows.length || !propertyId || importMut.isPending}
            className="active:scale-[0.97] transition-transform"
          >
            {importMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Importar {parsedRows.length} reserva(s)
          </Button>
        </div>
      </Card>
    </div>
  );
}
