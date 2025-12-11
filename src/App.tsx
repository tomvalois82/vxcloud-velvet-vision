import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/auth/Login";
import VeiculosEstoque from "./pages/veiculos/VeiculosEstoque";
import VeiculosRelatorios from "./pages/veiculos/VeiculosRelatorios";
import PessoasList from "./pages/pessoas/PessoasList";
import VendasList from "./pages/vendas/VendasList";
import VendasRelatorios from "./pages/vendas/VendasRelatorios";
import VendaVeiculo from "./pages/vendas/VendaVeiculo";
import VendaEditar from "./pages/vendas/VendaEditar";
import FinanceiroContas from "./pages/financeiro/FinanceiroContas";
import FinanceiroCartoes from "./pages/financeiro/FinanceiroCartoes";
import FinanceiroPagar from "./pages/financeiro/FinanceiroPagar";
import FinanceiroReceber from "./pages/financeiro/FinanceiroReceber";
import FinanceiroTransferencias from "./pages/financeiro/FinanceiroTransferencias";
import FinanceiroRelatorios from "./pages/financeiro/FinanceiroRelatorios";
import FinanceiroPainel from "./pages/financeiro/FinanceiroPainel";
import FinanceiroCategorias from "./pages/financeiro/FinanceiroCategorias";
import FinanceiroMargemRelatorio from "./pages/financeiro/FinanceiroMargemRelatorio";
import Configuracoes from "./pages/configuracoes/Configuracoes";
import FormasPagamento from "./pages/configuracoes/FormasPagamento";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <div className="flex-1 flex flex-col">
                        <header className="h-16 border-b border-border glass-strong flex items-center px-6 sticky top-0 z-10">
                          <SidebarTrigger />
                        </header>
                        <main className="flex-1 p-6 overflow-auto">
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/veiculos/estoque" element={<VeiculosEstoque />} />
                            <Route path="/veiculos/relatorios" element={<VeiculosRelatorios />} />
                            <Route path="/pessoas" element={<PessoasList />} />
                            <Route path="/vendas" element={<VendasList />} />
                            <Route path="/vendas/nova" element={<VendaVeiculo />} />
                            <Route path="/vendas/editar" element={<VendaEditar />} />
                            <Route path="/vendas/relatorios" element={<VendasRelatorios />} />
                            <Route path="/financeiro" element={<FinanceiroPainel />} />
                            <Route path="/financeiro/contas" element={<FinanceiroContas />} />
                            <Route path="/financeiro/cartoes" element={<FinanceiroCartoes />} />
                            <Route path="/financeiro/pagar" element={<FinanceiroPagar />} />
                            <Route path="/financeiro/receber" element={<FinanceiroReceber />} />
                            <Route path="/financeiro/transferencias" element={<FinanceiroTransferencias />} />
                            <Route path="/financeiro/categorias" element={<FinanceiroCategorias />} />
                            <Route path="/financeiro/relatorios" element={<FinanceiroRelatorios />} />
                            <Route path="/financeiro/margem" element={<FinanceiroMargemRelatorio />} />
                            <Route path="/configuracoes" element={<Configuracoes />} />
                            <Route path="/configuracoes/formas-pagamento" element={<FormasPagamento />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                      </div>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
