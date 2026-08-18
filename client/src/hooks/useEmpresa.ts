import { trpc } from "@/lib/trpc";

/**
 * Tipo de perfil (holding, administradora, ...) da EMPRESA em operação, não de quem está logado.
 *
 * Existe porque o mesmo engano já se repetiu várias vezes neste arquivo e em outros: uma tela lia
 * `user?.userType` — o perfil de quem entrou — quando deveria ler o da empresa aberta. Um contador
 * (perfil "escritório contábil", sem tipo de holding/administradora) operando um cliente holding
 * via esse padrão errado sempre cai no ramo "não é holding", mesmo a empresa sendo holding.
 *
 * Use este hook em qualquer tela que hoje faria `trpc.auth.me` só para ler `userType`.
 */
export function useEmpresaUserType(): string | null | undefined {
  const { data: empresa } = trpc.empresas.atual.useQuery(undefined, { retry: false });
  return empresa?.userType;
}
