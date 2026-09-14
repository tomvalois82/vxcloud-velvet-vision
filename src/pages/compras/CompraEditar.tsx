import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { PurchaseWizard } from '@/features/compras/components/PurchaseWizard';

const CompraEditar = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const compraId = searchParams.get('compraId');

  if (!compraId) {
    navigate('/compras');
    return null;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Editar compra" description="Alterar dados da compra" />

      <PurchaseWizard purchaseId={compraId} onClose={() => navigate('/compras')} />
    </div>
  );
};

export default CompraEditar;
