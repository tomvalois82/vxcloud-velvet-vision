import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { BarChart3 } from "lucide-react";

const VendasRelatorios = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Relatórios de Vendas"
        description="Análises e performance de vendas"
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={BarChart3}
          title="Nenhum relatório disponível"
          description="Os relatórios serão gerados após registrar vendas no sistema."
        />
      </div>
    </div>
  );
};

export default VendasRelatorios;
