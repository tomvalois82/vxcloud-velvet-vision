import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { SaleWizard } from '@/features/vendas/components/SaleWizard';
import { verificarVeiculoVendavel } from '@/features/vendas/services/veiculos-disponiveis';
import { toast } from '@/hooks/use-toast';

const VendaVeiculo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const vehicleId = searchParams.get('veiculoId');
  const [liberado, setLiberado] = useState(false);

  useEffect(() => {
    if (!vehicleId) {
      navigate('/veiculos/estoque');
      return;
    }
    let ativo = true;
    verificarVeiculoVendavel(Number(vehicleId)).then((bloqueio) => {
      if (!ativo) return;
      if (bloqueio) {
        toast({ title: 'Venda indisponível', description: bloqueio, variant: 'destructive' });
        navigate('/veiculos/estoque');
        return;
      }
      setLiberado(true);
    });
    return () => { ativo = false; };
  }, [vehicleId, navigate]);

  if (!vehicleId || !liberado) return null;

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
