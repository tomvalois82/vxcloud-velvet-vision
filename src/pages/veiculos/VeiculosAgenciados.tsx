import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Handshake } from "lucide-react";

const VeiculosAgenciados = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Veículos Agenciados"
        description="Veículos de terceiros em consignação"
      />

      <div className="glass rounded-lg p-8">
        <EmptyState
          icon={Handshake}
          title="Nenhum veículo agenciado"
          description="Não há veículos em consignação no momento."
        />
      </div>
    </div>
  );
};

export default VeiculosAgenciados;
