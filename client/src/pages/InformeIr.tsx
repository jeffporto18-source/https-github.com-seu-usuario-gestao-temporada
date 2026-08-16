import { useState } from "react";
import { FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { anoAtual, anos, brl, formatCompetencia, formatDate } from "@/lib/format";
import { PageHeader, EmptyState } from "./Clientes";

type Destinatario = "inquilino" | "proprietario";

const TITULOS: Record<Destinatario, string> = {
  inquilino: "Informe de pagamentos de aluguel",
  proprietario: "Informe de rendimentos de aluguel",
};

const cpfCnpj = (v: string | null | undefined) => v || "—";

export default function InformeIr() {
  const [ano, setAno] = useState<string>(anoAtual());
  const [contractId, setContractId] = useState<string>("");
  const [destinatario, setDestinatario] = useState<Destinatario>("inquilino");

  const { data: contratos } = trpc.longTermContracts.list.useQuery({});
  const { data: imoveis } = trpc.properties.list.useQuery();
  const { data, isLoading } = trpc.relatorios.informeIr.useQuery(
    { contractId: Number(contractId), ano },
    { enabled: !!contractId },
  );

  const nomeImovel = (id: number) => imoveis?.find((p) => p.id === id)?.apelido ?? "—";

  function baixarPdf() {
    if (!data) return;
    const doc = new jsPDF();
    const titulo = TITULOS[destinatario];

    doc.setFontSize(14);
    doc.text(titulo, 14, 15);
    doc.setFontSize(10);
    doc.text(`Ano-calendário: ${data.ano}`, 14, 22);

    const cabecalho: string[] = [];
    if (data.administradora.razaoSocial) {
      cabecalho.push(`Administradora: ${data.administradora.razaoSocial}${data.administradora.cnpj ? ` — CNPJ ${data.administradora.cnpj}` : ""}`);
    }
    if (data.imovel) cabecalho.push(`Imóvel: ${data.imovel.apelido}${data.imovel.endereco ? ` — ${data.imovel.endereco}` : ""}`);
    if (data.proprietario) cabecalho.push(`Proprietário: ${data.proprietario.nome} — CPF/CNPJ ${cpfCnpj(data.proprietario.cpfCnpj)}`);
    cabecalho.push(`Inquilino: ${data.contrato.nomeInquilino || "—"} — CPF/CNPJ ${cpfCnpj(data.contrato.cpfCnpjInquilino)}`);

    let y = 29;
    for (const linha of cabecalho) {
      doc.text(linha, 14, y);
      y += 5;
    }

    autoTable(doc, {
      startY: y + 3,
      head: [["Competência", "Recebimento", "Aluguel", "Multa/juros", "Desconto", "Valor considerado"]],
      body: data.meses.map((m) => [
        formatCompetencia(m.competencia),
        m.dataRecebimento ? formatDate(m.dataRecebimento) : "—",
        brl(m.aluguel),
        brl(m.multaJuros),
        brl(m.desconto),
        brl(m.valorRecebido),
      ]),
      foot: [["", "", brl(data.totalAluguel), brl(data.totalMultaJuros), brl(data.totalDesconto), brl(data.total)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    });

    const depois = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(8);
    const notas = [
      "Valores apurados pelo regime de caixa: consideram a data em que o aluguel foi efetivamente recebido.",
      "Condomínio e IPTU não compõem os valores acima por não constituírem rendimento de locação.",
    ];
    if (data.totalCondominio > 0 || data.totalIptu > 0) {
      notas.push(`No ano foram repassados ${brl(data.totalCondominio)} de condomínio e ${brl(data.totalIptu)} de IPTU, cobrados junto com o aluguel.`);
    }
    notas.forEach((n, i) => doc.text(n, 14, depois + i * 4));

    doc.save(`informe-ir-${destinatario}-${data.ano}.pdf`);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Informe de IR"
        subtitle="Demonstrativo anual do aluguel de um contrato de longa duração, pelo regime de caixa. Condomínio e IPTU ficam de fora por não serem rendimento de locação."
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={contractId} onValueChange={setContractId}>
          <SelectTrigger className="w-[260px] bg-card">
            <SelectValue placeholder="Selecione o contrato" />
          </SelectTrigger>
          <SelectContent>
            {(contratos ?? []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {nomeImovel(c.propertyId)} — {c.nomeInquilino || "sem inquilino"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger className="w-[140px] bg-card">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {anos().map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={destinatario} onValueChange={(v) => setDestinatario(v as Destinatario)}>
          <SelectTrigger className="w-[220px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inquilino">Para o inquilino (pagamentos)</SelectItem>
            <SelectItem value="proprietario">Para o proprietário (rendimentos)</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={baixarPdf} disabled={!data || data.meses.length === 0}>
          <FileText className="h-4 w-4 mr-2" />
          Baixar PDF
        </Button>
      </div>

      {!contractId ? (
        <EmptyState title="Selecione um contrato" subtitle="O informe é emitido por contrato de locação de longa duração." />
      ) : isLoading ? (
        <div className="h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : !data || data.meses.length === 0 ? (
        <EmptyState
          title="Nenhum aluguel recebido neste ano"
          subtitle="O informe considera apenas parcelas marcadas como recebidas, pela data de recebimento."
        />
      ) : (
        <>
          <Card className="mb-4 p-4">
            <p className="font-serif text-base font-semibold">{TITULOS[destinatario]}</p>
            <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
              {data.imovel && <p>Imóvel: <span className="text-foreground">{data.imovel.apelido}</span></p>}
              <p>Inquilino: <span className="text-foreground">{data.contrato.nomeInquilino || "—"}</span> · {cpfCnpj(data.contrato.cpfCnpjInquilino)}</p>
              {data.proprietario && (
                <p>Proprietário: <span className="text-foreground">{data.proprietario.nome}</span> · {cpfCnpj(data.proprietario.cpfCnpj)}</p>
              )}
              <p>Ano-calendário: <span className="text-foreground">{data.ano}</span></p>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Competência</th>
                    <th className="px-4 py-3 font-medium">Recebimento</th>
                    <th className="px-4 py-3 font-medium text-right">Aluguel</th>
                    <th className="px-4 py-3 font-medium text-right">Multa/juros</th>
                    <th className="px-4 py-3 font-medium text-right">Desconto</th>
                    <th className="px-4 py-3 font-medium text-right">Valor considerado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.meses.map((m, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 capitalize">{formatCompetencia(m.competencia)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.dataRecebimento ? formatDate(m.dataRecebimento) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{brl(m.aluguel)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{brl(m.multaJuros)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{brl(m.desconto)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{brl(m.valorRecebido)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary/10">
                    <td className="px-4 py-3 font-semibold" colSpan={5}>Total do ano</td>
                    <td className="px-4 py-3 text-right font-serif text-lg font-semibold text-primary tabular-nums">{brl(data.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card className="mt-4 p-4 text-xs text-muted-foreground">
            <p>Valores apurados pelo regime de caixa: contam pela data em que o aluguel foi efetivamente recebido, e não pela competência. Um aluguel de dezembro pago em janeiro entra no ano seguinte.</p>
            <p className="mt-1">Condomínio e IPTU não entram no total, por não constituírem rendimento de locação.</p>
            {(data.totalCondominio > 0 || data.totalIptu > 0) && (
              <p className="mt-1">
                No ano foram repassados <span className="text-foreground">{brl(data.totalCondominio)}</span> de condomínio e{" "}
                <span className="text-foreground">{brl(data.totalIptu)}</span> de IPTU, cobrados junto com o aluguel.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
