import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, Wallet } from "lucide-react";

const FinanceiroContas = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contas"
        description="Gerencie contas bancárias e caixas"
        action={
          <Button className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        }
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta cadastrada"
          description="Adicione contas bancárias ou caixas para começar o controle financeiro."
        />
      </div>
    </div>
  );
};

export default FinanceiroContas;
