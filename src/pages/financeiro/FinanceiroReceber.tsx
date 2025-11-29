import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpCircle } from "lucide-react";

const FinanceiroReceber = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contas a Receber"
        description="Gerencie recebimentos e cobranças"
        action={
          <Button className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Receita
          </Button>
        }
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={ArrowUpCircle}
          title="Nenhuma conta a receber"
          description="Não há recebimentos ou cobranças pendentes no momento."
        />
      </div>
    </div>
  );
};

export default FinanceiroReceber;
