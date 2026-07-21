import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Building2, User, BarChart3, FileText, Receipt, Phone, Check } from "lucide-react";
import { isValidCpf, isValidCnpj, formatPhone } from "@shared/validators";
import { UserType, USER_TYPES, USER_TYPES_BY_TIPO_CADASTRO } from "@/lib/userTypes";

type TipoCadastro = "pj" | "pf";

export default function Cadastro() {
  const [, setLocation] = useLocation();
  const [tipoCadastro, setTipoCadastro] = useState<TipoCadastro | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);

  const availableUserTypes = tipoCadastro
    ? USER_TYPES.filter((t) => USER_TYPES_BY_TIPO_CADASTRO[tipoCadastro].includes(t.value))
    : [];

  function selectTipoCadastro(v: TipoCadastro) {
    setTipoCadastro(v);
    setUserType(null);
  }

  // Campos PJ
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");

  // Campos PF
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [cpfResponsavel, setCpfResponsavel] = useState("");

  // Campos comuns
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  function formatCnpj(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  function formatCpf(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!tipoCadastro) {
      toast.error("Selecione Pessoa Jurídica ou Pessoa Física.");
      return;
    }

    if (!userType) {
      toast.error("Selecione seu perfil de atuação.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (tipoCadastro === "pj") {
      const cnpjDigits = cnpj.replace(/\D/g, "");
      if (cnpjDigits.length !== 14) {
        toast.error("CNPJ deve ter 14 dígitos.");
        return;
      }
      if (!isValidCnpj(cnpjDigits)) {
        toast.error("CNPJ inválido. Verifique o dígito verificador.");
        return;
      }
      if (!razaoSocial.trim()) {
        toast.error("Razão social é obrigatória.");
        return;
      }
      // Valida CPF do responsável PJ
      const cpfDigits = cpfResponsavel.replace(/\D/g, "");
      if (cpfDigits.length !== 11 || !isValidCpf(cpfDigits)) {
        toast.error("CPF do responsável inválido. Verifique o dígito verificador.");
        return;
      }
    }

    if (tipoCadastro === "pf") {
      const cpfDigits = cpfResponsavel.replace(/\D/g, "");
      if (cpfDigits.length !== 11) {
        toast.error("CPF deve ter 11 dígitos.");
        return;
      }
      if (!isValidCpf(cpfDigits)) {
        toast.error("CPF inválido. Verifique o dígito verificador.");
        return;
      }
      if (!nomeResponsavel.trim()) {
        toast.error("Nome completo é obrigatório.");
        return;
      }
    }

    setLoading(true);
    try {
      const body: Record<string, string> = {
        tipoCadastro,
        userType,
        email,
        password,
      };

      if (telefone) {
        body.telefone = telefone.replace(/\D/g, "");
      }

      if (tipoCadastro === "pj") {
        body.razaoSocial = razaoSocial;
        body.cnpj = cnpj.replace(/\D/g, "");
        body.nomeResponsavel = nomeResponsavel;
        body.cpfResponsavel = cpfResponsavel.replace(/\D/g, "");
      } else {
        body.nomeResponsavel = nomeResponsavel;
        body.cpfResponsavel = cpfResponsavel.replace(/\D/g, "");
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar conta.");
        return;
      }
      toast.success("Conta criada com sucesso!");
      window.location.href = "/painel";
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: Building2, text: "Gestão de imóveis e proprietários" },
    { icon: Receipt, text: "Controle de despesas por unidade" },
    { icon: FileText, text: "Emissão de NFS-e automatizada" },
    { icon: BarChart3, text: "DRE e repasse ao proprietário" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Lado esquerdo — branding */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-center px-12 xl:px-20 bg-card border-r border-border">
        <div className="max-w-md">
          <h1 className="font-serif text-4xl font-semibold tracking-tight mb-4">
            Temporada<span className="text-primary">.</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            A plataforma completa para gestão fiscal e financeira do seu aluguel por temporada.
          </p>
          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <span className="text-sm text-foreground">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 overflow-y-auto">
        <Card className="w-full max-w-lg border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="text-center pb-4">
            <div className="lg:hidden mb-4">
              <span className="font-serif text-2xl font-semibold tracking-tight">
                Temporada<span className="text-primary">.</span>
              </span>
            </div>
            <CardTitle className="text-2xl font-serif">Criar sua conta</CardTitle>
            <CardDescription>Preencha seus dados para começar a usar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Toggle PJ / PF */}
            <div className="flex rounded-lg border border-border overflow-hidden mb-6">
              <button
                type="button"
                onClick={() => selectTipoCadastro("pj")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                  tipoCadastro === "pj"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Building2 className="h-4 w-4" />
                Pessoa Jurídica
              </button>
              <button
                type="button"
                onClick={() => selectTipoCadastro("pf")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                  tipoCadastro === "pf"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                <User className="h-4 w-4" />
                Pessoa Física
              </button>
            </div>

            {/* Perfil de atuação — seleção única, depende do tipo de cadastro escolhido acima */}
            <div className="mb-6">
              <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Qual é o seu perfil?</p>
              {!tipoCadastro ? (
                <div className="rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-4 text-center">
                  <p className="text-xs text-muted-foreground">Escolha Pessoa Jurídica ou Pessoa Física acima para ver as opções de perfil.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Perfil de atuação">
                    {availableUserTypes.map((t) => {
                      const selected = userType === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setUserType(t.value)}
                          className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all ${
                            selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          {selected && (
                            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <t.icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="text-[11px] font-medium leading-tight">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {userType && (
                    <p className="text-xs text-muted-foreground mt-2">{USER_TYPES.find((t) => t.value === userType)?.desc}</p>
                  )}
                </>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campos PJ */}
              {tipoCadastro === "pj" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="razaoSocial">Razão Social</Label>
                    <Input
                      id="razaoSocial"
                      type="text"
                      placeholder="Ex.: Administradora Zé da Silva Ltda"
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                      required
                      maxLength={18}
                    />
                  </div>
                  <div className="border-t border-border pt-4 mt-4">
                    <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Responsável (acesso master)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nomeResponsavelPj">Nome do responsável</Label>
                    <Input
                      id="nomeResponsavelPj"
                      type="text"
                      placeholder="Nome completo do responsável"
                      value={nomeResponsavel}
                      onChange={(e) => setNomeResponsavel(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpfResponsavelPj">CPF do responsável</Label>
                    <Input
                      id="cpfResponsavelPj"
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpfResponsavel}
                      onChange={(e) => setCpfResponsavel(formatCpf(e.target.value))}
                      required
                      maxLength={14}
                    />
                  </div>
                </>
              )}

              {/* Campos PF */}
              {tipoCadastro === "pf" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nomeResponsavelPf">Nome completo</Label>
                    <Input
                      id="nomeResponsavelPf"
                      type="text"
                      placeholder="Seu nome completo"
                      value={nomeResponsavel}
                      onChange={(e) => setNomeResponsavel(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpfResponsavelPf">CPF</Label>
                    <Input
                      id="cpfResponsavelPf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpfResponsavel}
                      onChange={(e) => setCpfResponsavel(formatCpf(e.target.value))}
                      required
                      maxLength={14}
                    />
                  </div>
                </>
              )}

              {/* Campos comuns */}
              <div className="border-t border-border pt-4 mt-4">
                <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Dados de acesso</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mín. 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone / WhatsApp (opcional)</Label>
                <Input
                  id="telefone"
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  maxLength={15}
                />
              </div>

              <Button type="submit" className="w-full active:scale-[0.97] transition-transform mt-2" disabled={loading || !userType}>
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                Criar conta
              </Button>
              {!userType && (
                <p className="text-xs text-center text-muted-foreground">Escolha seu perfil de atuação acima para continuar.</p>
              )}
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="text-primary underline hover:text-primary/80"
              >
                Entrar
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
