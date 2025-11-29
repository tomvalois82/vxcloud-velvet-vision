import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Package } from "lucide-react";

const VeiculosEstoque = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Estoque"
        description="Controle de estoque de veículos"
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={Package}
          title="Estoque vazio"
          description="Nenhum veículo disponível no estoque no momento."
        />
      </div>
    </div>
  );
};

export default VeiculosEstoque;
