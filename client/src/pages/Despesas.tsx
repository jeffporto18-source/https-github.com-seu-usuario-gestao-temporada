import LancamentoManager from "@/components/LancamentoManager";

export default function Despesas() {
  return (
    <LancamentoManager
      titulo="Contas a Pagar"
      subtitulo="Cadastro das despesas por imóvel, classificadas no plano de contas. A baixa (pago, data e comprovante) é feita na aba Relatório."
      grupos={["despesa_fixa", "despesa_variavel"]}
      contraparteLabel="Fornecedor"
      contraparteholder="Ex.: Empresa de limpeza"
      contraparteFornecedor
      submitLabel="+ Cadastrar despesa"
      emptyLabel="Nenhuma despesa cadastrada ainda."
    />
  );
}
