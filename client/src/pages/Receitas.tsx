import LancamentoManager from "@/components/LancamentoManager";

export default function Receitas() {
  return (
    <LancamentoManager
      titulo="Receitas"
      subtitulo="Receitas extras por imóvel, classificadas no plano de contas. Alimenta a DRE."
      grupos={["receita"]}
      contraparteLabel="Cliente / origem"
      contraparteholder="Ex.: João Silva"
      submitLabel="+ Cadastrar receita"
      emptyLabel="Nenhuma receita cadastrada ainda."
    />
  );
}
