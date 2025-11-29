import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Package, Plus } from "lucide-react";

const VeiculosEstoque = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Estoque"
        description="Controle de estoque de veículos"
        action={
          <Button className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Novo Veículo
          </Button>
        }
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
