import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { SaleWizard } from '@/features/vendas/components/SaleWizard';

const VendaVeiculo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const vehicleId = searchParams.get('veiculoId');

  if (!vehicleId) {
    navigate('/veiculos/estoque');
    return null;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Nova Venda"
        description="Registrar venda de veículo"
      />

      <SaleWizard 
        vehicleId={Number(vehicleId)} 
        onClose={() => navigate('/veiculos/estoque')}
      />
    </div>
  );
};

export default VendaVeiculo;
