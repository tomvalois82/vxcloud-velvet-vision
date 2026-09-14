import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePurchaseData } from '../hooks/usePurchaseData';
import { PURCHASE_STEPS } from '../types';
import { StepPessoaCompra } from './steps/StepPessoaCompra';
import { StepVeiculoCompra } from './steps/StepVeiculoCompra';
import { StepAcertoCompra } from './steps/StepAcertoCompra';
import { StepConclusaoCompra } from './steps/StepConclusaoCompra';

interface PurchaseWizardProps {
  purchaseId?: string | null;
  onClose: () => void;
}

export function PurchaseWizard({ purchaseId, onClose }: PurchaseWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const purchaseHook = usePurchaseData(purchaseId);
  const {
    loading,
    saving,
    purchaseData,
    savePurchase,
    fornecedores,
    colaboradores,
    veiculosEstoque,
    formasPagamento,
    contas,
    updatePurchaseData,
    setFornecedor,
    setComprador,
    setVeiculo,
    addPayment,
    removePayment,
    refreshPessoas,
    refreshVeiculosEstoque,
    totals,
  } = purchaseHook;

  const totalSteps = PURCHASE_STEPS.length;

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return Boolean(purchaseData.id_fornecedor && purchaseData.id_comprador);
      case 2:
        return Boolean(purchaseData.veiculo && purchaseData.valor_compra > 0);
      default:
        return true;
    }
  };

  const handleSave = async () => {
    const result = await savePurchase(false);
    if (result) {
      navigate('/compras');
    }
  };

  const handleSaveAndClose = async () => {
    const result = await savePurchase(true);
    if (result) {
      navigate('/compras');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepPessoaCompra
            purchaseData={purchaseData}
            fornecedores={fornecedores}
            colaboradores={colaboradores}
            setFornecedor={setFornecedor}
            setComprador={setComprador}
            refreshPessoas={refreshPessoas}
          />
        );
      case 2:
        return (
          <StepVeiculoCompra
            purchaseData={purchaseData}
            veiculosEstoque={veiculosEstoque}
            setVeiculo={setVeiculo}
            updatePurchaseData={updatePurchaseData}
            refreshVeiculosEstoque={refreshVeiculosEstoque}
          />
        );
      case 3:
        return (
          <StepAcertoCompra
            purchaseData={purchaseData}
            formasPagamento={formasPagamento}
            contas={contas}
            addPayment={addPayment}
            removePayment={removePayment}
            totals={totals}
          />
        );
      case 4:
        return (
          <StepConclusaoCompra
            purchaseData={purchaseData}
            updatePurchaseData={updatePurchaseData}
            saving={saving}
            totals={totals}
            onSave={handleSave}
            onSaveAndClose={handleSaveAndClose}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados da compra...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Indicador de etapas */}
      <div className="glass rounded-lg p-4">
        <div className="flex items-center justify-between">
          {PURCHASE_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  'flex items-center gap-3 transition-all',
                  currentStep === step.id
                    ? 'opacity-100'
                    : currentStep > step.id
                      ? 'opacity-70 hover:opacity-100'
                      : 'opacity-40'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                    currentStep === step.id
                      ? 'bg-accent text-accent-foreground'
                      : currentStep > step.id
                        ? 'bg-accent/20 text-accent'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </button>
              {index < PURCHASE_STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4 transition-all',
                    currentStep > step.id ? 'bg-accent' : 'bg-border'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo da etapa */}
      <div className="glass rounded-lg p-6 min-h-[400px]">{renderStepContent()}</div>

      {/* Navegação */}
      {currentStep < totalSteps && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : () => setCurrentStep(prev => prev - 1)}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          <Button
            onClick={() => canGoNext() && setCurrentStep(prev => prev + 1)}
            disabled={!canGoNext() || saving}
            className="bg-accent hover:bg-accent/90"
          >
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
