import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEditSaleData } from '../hooks/useEditSaleData';
import { SALE_STEPS } from '../types';
import { StepPessoa } from './steps/StepPessoa';
import { StepVeiculo } from './steps/StepVeiculo';
import { StepTroca } from './steps/StepTroca';
import { StepAcerto } from './steps/StepAcerto';
import { StepConclusao } from './steps/StepConclusao';

interface EditSaleWizardProps {
  saleId: string;
  onClose: () => void;
}

export function EditSaleWizard({ saleId, onClose }: EditSaleWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const saleHook = useEditSaleData(saleId);
  const { loading, saving, saleData, saveSale } = saleHook;

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return !!saleData.id_cliente && !!saleData.id_vendedor;
      case 2:
        return !!saleData.veiculo;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 5 && canGoNext()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSave = async () => {
    console.log('=== handleSave CHAMADO ===');
    console.log('saleData atual:', saleData);
    console.log('saleData.financiamento:', saleData.financiamento);
    const result = await saveSale(false);
    console.log('Resultado do saveSale:', result);
    if (result) {
      navigate('/vendas');
    }
  };

  const handleSaveAndClose = async () => {
    console.log('=== handleSaveAndClose CHAMADO ===');
    console.log('saleData atual:', saleData);
    console.log('saleData.financiamento:', saleData.financiamento);
    const result = await saveSale(true);
    console.log('Resultado do saveSale:', result);
    if (result) {
      navigate('/vendas');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepPessoa {...saleHook} />;
      case 2:
        return <StepVeiculo {...saleHook} />;
      case 3:
        return <StepTroca {...saleHook} />;
      case 4:
        return <StepAcerto {...saleHook} />;
      case 5:
        return (
          <StepConclusao 
            {...saleHook} 
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
          <p className="text-muted-foreground">Carregando dados da venda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Step Indicator */}
      <div className="glass rounded-lg p-4">
        <div className="flex items-center justify-between">
          {SALE_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  "flex items-center gap-3 transition-all",
                  currentStep === step.id 
                    ? "opacity-100" 
                    : currentStep > step.id 
                      ? "opacity-70 hover:opacity-100" 
                      : "opacity-40"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                    currentStep === step.id
                      ? "bg-accent text-accent-foreground"
                      : currentStep > step.id
                        ? "bg-accent/20 text-accent"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </button>
              {index < SALE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4 transition-all",
                    currentStep > step.id ? "bg-accent" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="glass rounded-lg p-6 min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      {currentStep < 5 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : handlePrev}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          <Button
            onClick={handleNext}
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
