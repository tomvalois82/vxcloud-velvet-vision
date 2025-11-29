import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "./pages/Dashboard";
import VeiculosEstoque from "./pages/veiculos/VeiculosEstoque";
import VeiculosRelatorios from "./pages/veiculos/VeiculosRelatorios";
import PessoasList from "./pages/pessoas/PessoasList";
import VendasList from "./pages/vendas/VendasList";
import VendasRelatorios from "./pages/vendas/VendasRelatorios";
import FinanceiroContas from "./pages/financeiro/FinanceiroContas";
import FinanceiroPagar from "./pages/financeiro/FinanceiroPagar";
import FinanceiroReceber from "./pages/financeiro/FinanceiroReceber";
import FinanceiroTransferencias from "./pages/financeiro/FinanceiroTransferencias";
import FinanceiroRelatorios from "./pages/financeiro/FinanceiroRelatorios";
import Configuracoes from "./pages/configuracoes/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          <Route path="/vendas/relatorios" element={<VendasRelatorios />} />
          <Route path="/financeiro" element={<FinanceiroContas />} />
          <Route path="/financeiro/pagar" element={<FinanceiroPagar />} />
          <Route path="/financeiro/receber" element={<FinanceiroReceber />} />
          <Route path="/financeiro/transferencias" element={<FinanceiroTransferencias />} />
          <Route path="/financeiro/relatorios" element={<FinanceiroRelatorios />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
