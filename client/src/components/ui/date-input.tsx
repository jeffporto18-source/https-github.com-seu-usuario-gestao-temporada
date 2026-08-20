import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Campo de data no formato brasileiro (dd/mm/aaaa), sempre — independente do idioma do sistema
 * operacional ou do navegador de quem usa.
 *
 * `<input type="date">` nativo parecia a solução óbvia, mas o formato exibido nele é decidido pelo
 * SO/navegador, não pelo site: em uma máquina com Windows em inglês ele mostra mm/dd/aaaa mesmo
 * com o app inteiro em português. Por isso o valor aqui é escolhido por um calendário embutido
 * (Popover + Calendar), que sempre desenha "dd/mm/aaaa" no campo.
 *
 * Valor de entrada/saída continua "AAAA-MM-DD" (ISO), para não precisar tocar em nenhuma tela ou
 * rota que já lida com essa data — só a exibição muda.
 */
export function DateInput({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  className,
  disabled,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  const dataSelecionada = isoParaData(value);
  const rotulo = value ? isoParaBr(value) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start px-3 text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
          {rotulo || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dataSelecionada}
          defaultMonth={dataSelecionada}
          captionLayout="dropdown"
          onSelect={(data) => {
            onChange(data ? dataParaIso(data) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function isoParaData(iso: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dataParaIso(data: Date): string {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoParaBr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
