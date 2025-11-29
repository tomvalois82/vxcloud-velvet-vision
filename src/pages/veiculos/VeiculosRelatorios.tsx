import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { BarChart3 } from "lucide-react";

const VeiculosRelatorios = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Relatórios de Veículos"
        description="Análises e relatórios do estoque"
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={BarChart3}
          title="Nenhum relatório disponível"
          description="Os relatórios serão gerados quando houver dados suficientes."
        />
      </div>
    </div>
  );
};

export default VeiculosRelatorios;
