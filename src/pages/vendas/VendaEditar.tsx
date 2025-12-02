import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { EditSaleWizard } from '@/features/vendas/components/EditSaleWizard';

const VendaEditar = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const saleId = searchParams.get('vendaId');

  if (!saleId) {
    navigate('/vendas');
    return null;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Editar Venda"
        description="Alterar dados da venda"
      />

      <EditSaleWizard 
        saleId={saleId} 
        onClose={() => navigate('/vendas')}
      />
    </div>
  );
};

export default VendaEditar;
