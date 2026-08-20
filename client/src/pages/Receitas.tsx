import LancamentoManager from "@/components/LancamentoManager";

export default function Receitas() {
  return (
    <LancamentoManager
      titulo="Contas a Receber"
      subtitulo="Cadastro das receitas por imóvel, classificadas no plano de contas. A baixa (recebido, data e comprovante) é feita na aba Relatório."
      grupos={["receita"]}
      contraparteLabel="Cliente / origem"
      contraparteholder="Ex.: João Silva"
      submitLabel="+ Cadastrar receita"
      emptyLabel="Nenhuma receita cadastrada ainda."
    />
  );
}
