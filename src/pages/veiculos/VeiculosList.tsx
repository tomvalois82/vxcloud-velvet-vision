import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, Car } from "lucide-react";

const VeiculosList = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Veículos"
        description="Gerencie o estoque de veículos"
        action={
          <Button className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Novo Veículo
          </Button>
        }
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={Car}
          title="Nenhum veículo cadastrado"
          description="Comece adicionando veículos ao sistema para gerenciar seu estoque."
        />
      </div>
    </div>
  );
};

export default VeiculosList;
