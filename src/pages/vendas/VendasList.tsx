import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart } from "lucide-react";

const VendasList = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Vendas"
        description="Gerencie todas as vendas realizadas"
        action={
          <Button className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Venda
          </Button>
        }
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={ShoppingCart}
          title="Nenhuma venda registrada"
          description="Inicie uma nova venda para começar a registrar transações."
        />
      </div>
    </div>
  );
};

export default VendasList;
