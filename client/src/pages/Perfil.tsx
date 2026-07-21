import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, Building2, User, Phone } from "lucide-react";
import { isValidCpf, isValidCnpj, formatPhone } from "@shared/validators";

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

export default function Perfil() {
  const { data: profile, isLoading } = trpc.profile.get.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      utils.profile.get.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [name, setName] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cpfResponsavel, setCpfResponsavel] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setRazaoSocial(profile.razaoSocial || "");
      setCnpj(profile.cnpj ? formatCnpj(profile.cnpj) : "");
      setCpfResponsavel(profile.cpfResponsavel ? formatCpf(profile.cpfResponsavel) : "");
      setNomeResponsavel(profile.nomeResponsavel || "");
      setTelefone(profile.telefone ? formatPhone(profile.telefone) : "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validações
    const cpfDigits = cpfResponsavel.replace(/\D/g, "");
    if (cpfDigits && !isValidCpf(cpfDigits)) {
      toast.error("CPF inválido. Verifique o dígito verificador.");
      return;
    }

    const cnpjDigits = cnpj.replace(/\D/g, "");
    if (cnpjDigits && !isValidCnpj(cnpjDigits)) {
      toast.error("CNPJ inválido. Verifique o dígito verificador.");
      return;
    }

    updateMutation.mutate({
      name: name || undefined,
      razaoSocial: razaoSocial || undefined,
      cnpj: cnpj || undefined,
      cpfResponsavel: cpfResponsavel || undefined,
      nomeResponsavel: nomeResponsavel || undefined,
      telefone: telefone || undefined,
      email: email || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const isPj = profile?.tipoCadastro === "pj";

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-serif font-semibold mb-6">Meu Perfil</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados da empresa (PJ) */}
        {isPj && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>Informações da pessoa jurídica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="razaoSocial">Razão Social</Label>
                <Input
                  id="razaoSocial"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Razão social da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados pessoais / responsável */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              {isPj ? "Responsável (Master)" : "Dados Pessoais"}
            </CardTitle>
            <CardDescription>
              {isPj ? "Pessoa física responsável pela empresa" : "Suas informações pessoais"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nomeResponsavel">{isPj ? "Nome do responsável" : "Nome completo"}</Label>
              <Input
                id="nomeResponsavel"
                value={isPj ? nomeResponsavel : name}
                onChange={(e) => isPj ? setNomeResponsavel(e.target.value) : setName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpfResponsavel">CPF</Label>
              <Input
                id="cpfResponsavel"
                value={cpfResponsavel}
                onChange={(e) => setCpfResponsavel(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone / WhatsApp</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending} className="active:scale-[0.97] transition-transform">
            {updateMutation.isPending ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar alterações
          </Button>
        </div>
      </form>
    </div>
  );
}
