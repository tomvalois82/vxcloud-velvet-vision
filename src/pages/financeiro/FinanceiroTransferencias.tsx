import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeftRight } from "lucide-react";

const FinanceiroTransferencias = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Transferências"
        description="Gerencie transferências entre contas"
        action={
          <Button className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Transferência
          </Button>
        }
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={ArrowLeftRight}
          title="Nenhuma transferência registrada"
          description="Não há transferências entre contas no momento."
        />
      </div>
    </div>
  );
};

export default FinanceiroTransferencias;
