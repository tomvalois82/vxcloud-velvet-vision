import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, ArrowDownCircle } from "lucide-react";

const FinanceiroPagar = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contas a Pagar"
        description="Gerencie despesas e pagamentos"
        action={
          <Button className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        }
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={ArrowDownCircle}
          title="Nenhuma conta a pagar"
          description="Não há despesas ou pagamentos pendentes no momento."
        />
      </div>
    </div>
  );
};

export default FinanceiroPagar;
