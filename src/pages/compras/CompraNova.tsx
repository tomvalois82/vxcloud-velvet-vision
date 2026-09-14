import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { PurchaseWizard } from '@/features/compras/components/PurchaseWizard';

const CompraNova = () => {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in">
      <PageHeader title="Nova compra" description="Registrar a compra de um veículo" />

      <PurchaseWizard onClose={() => navigate('/compras')} />
    </div>
  );
};

export default CompraNova;
