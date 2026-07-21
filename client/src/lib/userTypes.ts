import { Building2, User, Users, Landmark, UserCog2 } from "lucide-react";

export type UserType = "administradora" | "admin_airbnb" | "proprietario" | "holding" | "gestor_temporada_pj";

export const USER_TYPES: { value: UserType; label: string; desc: string; icon: typeof Building2 }[] = [
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

/** Perfis disponíveis para cada tipo de cadastro (PJ ou PF). */
export const USER_TYPES_BY_TIPO_CADASTRO: Record<"pj" | "pf", UserType[]> = {
  pj: ["holding", "administradora", "gestor_temporada_pj"],
  pf: ["proprietario", "admin_airbnb"],
};
