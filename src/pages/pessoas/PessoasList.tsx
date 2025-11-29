import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

const PessoasList = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pessoas"
        description="Gerencie clientes, fornecedores e contatos"
        action={
          <Button className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Pessoa
          </Button>
        }
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={Users}
          title="Nenhuma pessoa cadastrada"
          description="Adicione clientes, fornecedores ou outros contatos ao sistema."
        />
      </div>
    </div>
  );
};

export default PessoasList;
