import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { competencias } from "@/lib/format";

type Prop = { id: number; apelido: string; tipoLocacao?: string };

export function UnitPeriodFilter({
  properties,
  propertyId,
  setPropertyId,
  competencia,
  setCompetencia,
  showAllOption,
}: {
  properties: Prop[] | undefined;
  propertyId: string;
  setPropertyId: (v: string) => void;
  competencia: string;
  setCompetencia: (v: string) => void;
  showAllOption?: boolean;
}) {
  const meses = competencias();
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <Select value={propertyId} onValueChange={setPropertyId}>
        <SelectTrigger className="w-[240px] bg-card">
          <SelectValue placeholder="Selecione o imóvel" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">Todos os imóveis</SelectItem>}
          {properties?.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.apelido}
              {p.tipoLocacao && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({p.tipoLocacao === "longa" ? "longa" : "curta"})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={competencia} onValueChange={setCompetencia}>
        <SelectTrigger className="w-[160px] bg-card">
          <SelectValue placeholder="Competência" />
        </SelectTrigger>
        <SelectContent>
          {meses.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
