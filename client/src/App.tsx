import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Painel from "./pages/Painel";
import Clientes from "./pages/Clientes";
import Imoveis from "./pages/Imoveis";
import Imobiliarias from "./pages/Imobiliarias";
import GestoresTemporada from "./pages/GestoresTemporada";
import Contratos from "./pages/Contratos";
import AlugueisReceber from "./pages/AlugueisReceber";
import Inventario from "./pages/Inventario";
import Despesas from "./pages/Despesas";
import Investimentos from "./pages/Investimentos";
import Reservas from "./pages/Reservas";
import Dre from "./pages/Dre";
import Repasse from "./pages/Repasse";
import ImportarCsv from "./pages/ImportarCsv";
import Onboarding from "./pages/Onboarding";
import Perfil from "./pages/Perfil";
import Usuarios from "./pages/Usuarios";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayoutSkeleton } from "./components/DashboardLayoutSkeleton";

/** Redireciona para / (cadastro) se não autenticado, e para /onboarding se não escolheu perfil */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!isAuthenticated) return <Redirect to="/" />;

  // Se o usuário está logado mas não completou o onboarding (escolha de perfil)
  if (!user?.userType) {
    return <Redirect to="/onboarding" />;
  }

  return <>{children}</>;
}

/** Redireciona usuários já autenticados para o painel (evita ver tela de login/cadastro) */
function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;
  if (isAuthenticated) {
    if (!user?.userType) return <Redirect to="/onboarding" />;
    return <Redirect to="/painel" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Switch>
            {/* Primeira tela: cadastro */}
            <Route path="/">
              <GuestOnly><Cadastro /></GuestOnly>
            </Route>
            <Route path="/login">
              <GuestOnly><Login /></GuestOnly>
            </Route>
            <Route path="/cadastro">
              <GuestOnly><Cadastro /></GuestOnly>
            </Route>

            {/* Segunda tela: escolha de perfil */}
            <Route path="/onboarding" component={Onboarding} />

            {/* Painel principal (requer auth + perfil) */}
            <Route path="/painel">
              <RequireAuth>
                <DashboardLayout><Painel /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/app">
              <RequireAuth>
                <DashboardLayout><Painel /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/clientes">
              <RequireAuth>
                <DashboardLayout><Clientes /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/imoveis">
              <RequireAuth>
                <DashboardLayout><Imoveis /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/imobiliarias">
              <RequireAuth>
                <DashboardLayout><Imobiliarias /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/gestores-temporada">
              <RequireAuth>
                <DashboardLayout><GestoresTemporada /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/reservas">
              <RequireAuth>
                <DashboardLayout><Reservas /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/contratos">
              <RequireAuth>
                <DashboardLayout><Contratos /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/alugueis-receber">
              <RequireAuth>
                <DashboardLayout><AlugueisReceber /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/despesas">
              <RequireAuth>
                <DashboardLayout><Despesas /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/investimentos">
              <RequireAuth>
                <DashboardLayout><Investimentos /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/inventario">
              <RequireAuth>
                <DashboardLayout><Inventario /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/dre">
              <RequireAuth>
                <DashboardLayout><Dre /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/repasse">
              <RequireAuth>
                <DashboardLayout><Repasse /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/importar">
              <RequireAuth>
                <DashboardLayout><ImportarCsv /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/perfil">
              <RequireAuth>
                <DashboardLayout><Perfil /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/usuarios">
              <RequireAuth>
                <DashboardLayout><Usuarios /></DashboardLayout>
              </RequireAuth>
            </Route>
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
