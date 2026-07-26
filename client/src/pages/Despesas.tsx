import LancamentoManager from "@/components/LancamentoManager";

export default function Despesas() {
  return (
    <LancamentoManager
      titulo="Despesas"
      subtitulo="Despesas fixas e variáveis por imóvel, classificadas no plano de contas. Alimenta a DRE."
      grupos={["despesa_fixa", "despesa_variavel"]}
      contraparteLabel="Fornecedor"
      contraparteholder="Ex.: Empresa de limpeza"
      submitLabel="+ Cadastrar despesa"
      emptyLabel="Nenhuma despesa cadastrada ainda."
    />
  );
}
