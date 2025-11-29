import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { BarChart3 } from "lucide-react";

const FinanceiroRelatorios = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Relatórios Financeiros"
        description="Análises e indicadores financeiros"
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={BarChart3}
          title="Nenhum relatório disponível"
          description="Os relatórios financeiros serão gerados quando houver movimentações."
        />
      </div>
    </div>
  );
};

export default FinanceiroRelatorios;
