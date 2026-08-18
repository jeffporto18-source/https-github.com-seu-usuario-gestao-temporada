import { useEffect, useState } from "react";
import { Building2, Landmark, Trash2, ShieldCheck, Pencil, KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NIVEIS_ACESSO, NIVEL_ACESSO_INFO, type NivelAcesso } from "@shared/niveis";
import { USER_TYPES } from "@/lib/userTypes";
import { PageHeader, EmptyState, SkeletonList } from "./Clientes";

type Empresa = {
  id: number;
  nome: string;
  razaoSocial: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  userType: string | null;
  acessos: { userId: number; nome: string | null; email: string | null; nivel: string; ehDonoDaEmpresa: boolean }[];
};

/**
 * Painel do escritório contábil: cadastra empresas clientes, corrige os dados delas, redefine a
 * senha do responsável, e decide quem da equipe atende cada uma e com que alcance.
 *
 * Conceder acesso aqui abre os dados de um cliente para alguém de fora dele — por isso nada é
 * concedido automaticamente e cada linha mostra explicitamente quem enxerga o quê.
 */
export default function Escritorio() {
  const utils = trpc.useUtils();
  const { data: empresas, isLoading } = trpc.escritorio.empresas.useQuery();
  const { data: pessoas } = trpc.escritorio.pessoas.useQuery();

  const [pessoaSelecionada, setPessoaSelecionada] = useState<string>("");
  const [nivelSelecionado, setNivelSelecionado] = useState<NivelAcesso>("total");
  const [novaEmpresaOpen, setNovaEmpresaOpen] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [redefinindoSenha, setRedefinindoSenha] = useState<Empresa | null>(null);

  const invalidarEmpresas = () => {
    utils.escritorio.empresas.invalidate();
    utils.empresas.minhas.invalidate();
  };

  const conceder = trpc.escritorio.conceder.useMutation({
    onSuccess: () => { invalidarEmpresas(); toast.success("Acesso concedido."); },
    onError: (e) => toast.error(e.message),
  });

  const revogar = trpc.escritorio.revogar.useMutation({
    onSuccess: () => { invalidarEmpresas(); toast.success("Acesso removido."); },
    onError: (e) => toast.error(e.message),
  });

  const nomePessoa = (id: number) => pessoas?.find((p) => p.id === id)?.nome ?? `Usuário ${id}`;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Escritório"
        subtitle="Cadastre empresas clientes, corrija os dados delas e decida quem da sua equipe atende cada uma."
        action={
          <Button size="sm" onClick={() => setNovaEmpresaOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Nova empresa
          </Button>
        }
      />

      <Card className="mb-5 p-4">
        <p className="text-sm font-medium">Liberar acesso para a sua equipe</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Você já enxerga todas as empresas abaixo — é o escritório. Aqui você libera o acesso dos seus
          funcionários, empresa por empresa, porque nem todos precisam atender a carteira inteira.
        </p>
        {pessoas?.length === 0 && (
          <p className="mt-2 rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            Você ainda não cadastrou ninguém na equipe. Cadastre em <strong>Usuários</strong> e essas pessoas
            aparecerão aqui.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <label className="text-[11px] text-muted-foreground">Pessoa</label>
            <Select value={pessoaSelecionada} onValueChange={setPessoaSelecionada}>
              <SelectTrigger className="h-9 w-[240px]">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {(pessoas ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-[11px] text-muted-foreground">Nível</label>
            <Select value={nivelSelecionado} onValueChange={(v) => setNivelSelecionado(v as NivelAcesso)}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NIVEIS_ACESSO.map((n) => (
                  <SelectItem key={n} value={n}>{NIVEL_ACESSO_INFO[n].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{NIVEL_ACESSO_INFO[nivelSelecionado].descricao}</p>
      </Card>

      {isLoading ? (
        <SkeletonList />
      ) : !empresas?.length ? (
        <EmptyState title="Nenhuma empresa cadastrada" subtitle="Use o botão Nova empresa, no topo, para cadastrar o primeiro cliente." />
      ) : (
        <div className="space-y-3">
          {empresas.map((e) => (
            <Card key={e.id} className="overflow-hidden py-0">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/40 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  {e.userType === "holding" ? (
                    <Landmark className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.email}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar dados da empresa" onClick={() => setEditando(e)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Redefinir a senha do responsável" onClick={() => setRedefinindoSenha(e)}>
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={!pessoaSelecionada || conceder.isPending}
                    // Um botão que não clica precisa dizer por quê; sem isto ele fica mudo e a tela
                    // parece quebrada.
                    title={pessoaSelecionada ? "Liberar esta empresa para a pessoa selecionada" : "Escolha antes uma pessoa da equipe, acima"}
                    onClick={() =>
                      conceder.mutate({ userId: Number(pessoaSelecionada), empresaId: e.id, nivel: nivelSelecionado })
                    }
                  >
                    Liberar
                  </Button>
                </div>
              </div>

              <ul className="divide-y divide-border">
                {e.acessos.map((a) => (
                  <li key={a.userId} className="flex items-center gap-3 px-4 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {a.nome || a.email || nomePessoa(a.userId)}
                        {a.ehDonoDaEmpresa && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                            <ShieldCheck className="h-3 w-3" /> dono
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{NIVEL_ACESSO_INFO[a.nivel as NivelAcesso]?.label ?? a.nivel}</p>
                    </div>
                    {!a.ehDonoDaEmpresa && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => revogar.mutate({ userId: a.userId, empresaId: e.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <NovaEmpresaDialog open={novaEmpresaOpen} onOpenChange={setNovaEmpresaOpen} onCriada={invalidarEmpresas} />
      <EditarEmpresaDialog empresa={editando} onOpenChange={(v) => !v && setEditando(null)} onSalvo={invalidarEmpresas} />
      <RedefinirSenhaDialog empresa={redefinindoSenha} onOpenChange={(v) => !v && setRedefinindoSenha(null)} />
    </div>
  );
}

/** Cadastra uma empresa cliente sem sair da sessão do escritório — a alternativa seria deslogar e usar o formulário público. */
function NovaEmpresaDialog({ open, onOpenChange, onCriada }: { open: boolean; onOpenChange: (v: boolean) => void; onCriada: () => void }) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [userType, setUserType] = useState("holding");
  const [senhaInicial, setSenhaInicial] = useState("");

  const limpar = () => {
    setRazaoSocial(""); setCnpj(""); setEmail(""); setTelefone(""); setNomeResponsavel(""); setUserType("holding"); setSenhaInicial("");
  };

  const criar = trpc.escritorio.criarEmpresa.useMutation({
    onSuccess: () => {
      toast.success("Empresa cadastrada. Ela já aparece na lista.");
      onCriada();
      onOpenChange(false);
      limpar();
    },
    onError: (e) => toast.error(e.message),
  });

  // Perfis oferecidos aqui excluem "Escritório Contábil" (é papel exclusivo de quem atende
  // terceiros, não de um cliente) e o cadastro público reaproveitado só entende os cinco de PJ/PF
  // originais — a mesma lista que USER_TYPES já usa fora do escritório.
  const perfis = USER_TYPES.filter((t) => t.value !== "escritorio_contabil");

  const salvar = () => {
    if (!razaoSocial.trim() || !cnpj.trim() || !email.trim() || !senhaInicial) {
      toast.error("Razão social, CNPJ, e-mail e senha inicial são obrigatórios.");
      return;
    }
    if (senhaInicial.length < 6) { toast.error("A senha inicial deve ter no mínimo 6 caracteres."); return; }
    criar.mutate({ razaoSocial, cnpj, email, telefone: telefone || undefined, nomeResponsavel: nomeResponsavel || undefined, userType: userType as never, senhaInicial });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-serif">Nova empresa</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          A empresa aparece na sua lista assim que for criada. Passe o e-mail e a senha inicial para o
          responsável — ele deve trocar a senha no primeiro acesso, em Meu Perfil.
        </p>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Razão social</Label>
            <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="grid gap-1.5">
              <Label>Perfil</Label>
              <Select value={userType} onValueChange={setUserType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {perfis.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>E-mail de acesso</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="responsavel@empresa.com" />
            </div>
            <div className="grid gap-1.5">
              <Label>Telefone (opcional)</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Nome do responsável (opcional)</Label>
              <Input value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Senha inicial</Label>
              <Input value={senhaInicial} onChange={(e) => setSenhaInicial(e.target.value)} placeholder="Mín. 6 caracteres" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={criar.isPending}>{criar.isPending ? "Criando..." : "Criar empresa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Corrige os dados de uma empresa já cadastrada — o caso comum é o e-mail de teste virando o oficial. */
function EditarEmpresaDialog({ empresa, onOpenChange, onSalvo }: { empresa: Empresa | null; onOpenChange: (v: boolean) => void; onSalvo: () => void }) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // Preenche o formulário sempre que uma empresa diferente é aberta.
  useEffect(() => {
    if (!empresa) return;
    setRazaoSocial(empresa.razaoSocial ?? "");
    setCnpj(empresa.cnpj ?? "");
    setEmail(empresa.email ?? "");
    setTelefone(empresa.telefone ?? "");
  }, [empresa?.id]);

  const editar = trpc.escritorio.editarEmpresa.useMutation({
    onSuccess: () => {
      toast.success("Dados atualizados.");
      onSalvo();
      onOpenChange(false);
      setRazaoSocial(""); setCnpj(""); setEmail(""); setTelefone("");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!empresa) return null;

  return (
    <Dialog open={!!empresa} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-serif">Editar {empresa.nome}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Razão social</Label>
            <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>CNPJ</Label>
            <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>E-mail de acesso</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">É o e-mail usado para entrar no sistema — trocar aqui muda o login do responsável.</p>
          </div>
          <div className="grid gap-1.5">
            <Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={editar.isPending}
            onClick={() => editar.mutate({ empresaId: empresa.id, razaoSocial, cnpj, email, telefone })}
          >
            {editar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Redefine a senha do responsável pela empresa — resolve o cliente que esqueceu a senha sem depender de mexer no banco. */
function RedefinirSenhaDialog({ empresa, onOpenChange }: { empresa: Empresa | null; onOpenChange: (v: boolean) => void }) {
  const [novaSenha, setNovaSenha] = useState("");

  const redefinir = trpc.escritorio.redefinirSenhaDaEmpresa.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida. Passe a senha nova para o responsável.");
      onOpenChange(false);
      setNovaSenha("");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!empresa) return null;

  return (
    <Dialog open={!!empresa} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-serif">Redefinir senha — {empresa.nome}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          O responsável ({empresa.email}) passa a entrar com a senha nova. Oriente-o a trocá-la em
          Meu Perfil no primeiro acesso.
        </p>
        <div className="grid gap-1.5 py-2">
          <Label>Nova senha</Label>
          <Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mín. 6 caracteres" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={redefinir.isPending || novaSenha.length < 6}
            onClick={() => redefinir.mutate({ empresaId: empresa.id, novaSenha })}
          >
            {redefinir.isPending ? "Redefinindo..." : "Redefinir senha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
