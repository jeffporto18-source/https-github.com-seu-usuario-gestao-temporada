import { Building2, User, Users, Landmark, UserCog2, Briefcase } from "lucide-react";

export type UserType =
  | "administradora"
  | "admin_airbnb"
  | "proprietario"
  | "holding"
  | "gestor_temporada_pj"
  | "escritorio_contabil";

export const USER_TYPES: { value: UserType; label: string; desc: string; icon: typeof Building2 }[] = [
  {
    // O escritório não gere imóveis próprios: ele atende as empresas dos clientes. Por isso vem
    // primeiro na lista e não aparece como opção no cadastro público — quem se cadastra sozinho
    // está criando uma empresa, não um escritório.
    value: "escritorio_contabil",
    label: "Escritório Contábil",
    desc: "Atende as empresas dos clientes; não administra imóveis próprios.",
    icon: Briefcase,
  },
  {
    value: "holding",
    label: "Holding",
    desc: "Empresa patrimonial que detém imóveis próprios para locação.",
    icon: Landmark,
  },
  {
    value: "administradora",
    label: "Administradora de Imóveis",
    desc: "Empresa que gerencia múltiplos imóveis de terceiros por comissão.",
    icon: Building2,
  },
  {
    value: "proprietario",
    label: "Proprietário (PF)",
    desc: "Dono de imóvel(is) que aluga diretamente por temporada.",
    icon: User,
  },
  {
    value: "admin_airbnb",
    label: "Gestor de Curta Temporada (PF)",
    desc: "Profissional autônomo que administra imóveis de terceiros em plataformas.",
    icon: Users,
  },
  {
    value: "gestor_temporada_pj",
    label: "Gestor de Curta Temporada (PJ)",
    desc: "Empresa que presta serviço de gestão de temporada para proprietários terceiros.",
    icon: UserCog2,
  },
];

/**
 * Perfis oferecidos no cadastro público.
 *
 * `escritorio_contabil` fica de fora de propósito: quem se cadastra sozinho está criando a
 * empresa dele, não um escritório que atende terceiros. Esse perfil é atribuído junto com o
 * `role = admin`, que é o que de fato dá acesso às empresas clientes.
 */
export const USER_TYPES_BY_TIPO_CADASTRO: Record<"pj" | "pf", UserType[]> = {
  pj: ["holding", "administradora", "gestor_temporada_pj"],
  pf: ["proprietario", "admin_airbnb"],
};
