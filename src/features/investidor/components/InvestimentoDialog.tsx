import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Investimento {
  id: string;
  id_pessoa: string;
  id_estoque: number;
  percentual_investido: number;
  valor_investido: number;
  data_criacao: string;
  data_finalizado: string | null;
  id_grupo_wtz: string | null;
}

interface Pessoa {
  id: string;
  nome: string;
}

interface Veiculo {
  id: number;
  placa: string | null;
  modelo: string | null;
  valor_aquisicao: number;
}

interface InvestimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investimento: Investimento | null;
  onSuccess: () => void;
}

export function InvestimentoDialog({
  open,
  onOpenChange,
  investimento,
  onSuccess,
}: InvestimentoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [investidores, setInvestidores] = useState<Pessoa[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  
  const [idPessoa, setIdPessoa] = useState('');
  const [idEstoque, setIdEstoque] = useState('');
  const [percentual, setPercentual] = useState('');
  const [valorInvestido, setValorInvestido] = useState('');
  const [dataCriacao, setDataCriacao] = useState<Date>(new Date());

  useEffect(() => {
    if (open) {
      loadInvestidores();
      loadVeiculos();
      
      if (investimento) {
        setIdPessoa(investimento.id_pessoa);
        setIdEstoque(String(investimento.id_estoque));
        setPercentual(String(investimento.percentual_investido));
        setValorInvestido(formatCurrencyInput(investimento.valor_investido));
        setDataCriacao(new Date(investimento.data_criacao));
      } else {
        resetForm();
      }
    }
  }, [open, investimento]);

  const resetForm = () => {
    setIdPessoa('');
    setIdEstoque('');
    setPercentual('');
    setValorInvestido('');
    setDataCriacao(new Date());
  };

  const loadInvestidores = async () => {
    const { data, error } = await supabase
      .from('vx_pessoa')
      .select('id, nome')
      .eq('eh_investidor', true)
      .order('nome');

    if (error) {
      console.error('Erro ao carregar investidores:', error);
      return;
    }

    setInvestidores(data || []);
  };

  const loadVeiculos = async () => {
    const { data, error } = await supabase
      .from('estoque')
      .select('id, placa, modelo, valor_aquisicao')
      .order('modelo');

    if (error) {
      console.error('Erro ao carregar veículos:', error);
      return;
    }

    setVeiculos(data || []);
  };

  const formatCurrencyInput = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  const parseCurrencyInput = (value: string) => {
    const cleanValue = value.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    const numValue = parseInt(value, 10) / 100;
    setValorInvestido(formatCurrencyInput(numValue));
  };

  const validatePercentual = async () => {
    if (!idEstoque || !percentual) return true;

    const percentualNum = parseFloat(percentual);
    
    // Buscar todos os investimentos do mesmo veículo
    const { data: existingInvestimentos, error } = await supabase
      .from('vx_investimento')
      .select('percentual_investido, id')
      .eq('id_estoque', parseInt(idEstoque));

    if (error) {
      console.error('Erro ao validar percentual:', error);
      return false;
    }

    // Calcular soma dos percentuais (excluindo o investimento atual se for edição)
    const totalPercentual = (existingInvestimentos || [])
      .filter(inv => inv.id !== investimento?.id)
      .reduce((sum, inv) => sum + inv.percentual_investido, 0);

    if (totalPercentual + percentualNum > 100) {
      toast.error(`Percentual excede 100%. Disponível: ${100 - totalPercentual}%`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!idPessoa || !idEstoque || !percentual || !valorInvestido) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const percentualNum = parseFloat(percentual);
    if (percentualNum <= 0 || percentualNum > 100) {
      toast.error('Percentual deve ser entre 1 e 100');
      return;
    }

    const isValid = await validatePercentual();
    if (!isValid) return;

    setLoading(true);

    try {
      const data = {
        id_pessoa: idPessoa,
        id_estoque: parseInt(idEstoque),
        percentual_investido: percentualNum,
        valor_investido: parseCurrencyInput(valorInvestido),
        data_criacao: format(dataCriacao, 'yyyy-MM-dd'),
      };

      if (investimento) {
        const { error } = await supabase
          .from('vx_investimento')
          .update(data)
          .eq('id', investimento.id);

        if (error) throw error;
        toast.success('Investimento atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('vx_investimento')
          .insert(data);

        if (error) throw error;
        toast.success('Investimento cadastrado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar investimento:', error);
      toast.error('Erro ao salvar investimento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle>
            {investimento ? 'Editar Investimento' : 'Novo Investimento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="investidor">Investidor *</Label>
            <Select value={idPessoa} onValueChange={setIdPessoa}>
              <SelectTrigger id="investidor" className="bg-background/50">
                <SelectValue placeholder="Selecione o investidor" />
              </SelectTrigger>
              <SelectContent>
                {investidores.map((pessoa) => (
                  <SelectItem key={pessoa.id} value={pessoa.id}>
                    {pessoa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {investidores.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum investidor cadastrado. Marque uma pessoa como investidor no módulo Pessoas.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="veiculo">Veículo *</Label>
            <Select value={idEstoque} onValueChange={setIdEstoque}>
              <SelectTrigger id="veiculo" className="bg-background/50">
                <SelectValue placeholder="Selecione o veículo" />
              </SelectTrigger>
              <SelectContent>
                {veiculos.map((veiculo) => (
                  <SelectItem key={veiculo.id} value={String(veiculo.id)}>
                    {veiculo.placa || 'S/P'} - {veiculo.modelo || 'Sem modelo'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="percentual">Percentual (%) *</Label>
              <Input
                id="percentual"
                type="number"
                min="1"
                max="100"
                step="0.01"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
                placeholder="50"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor Investido *</Label>
              <Input
                id="valor"
                value={valorInvestido}
                onChange={handleValorChange}
                placeholder="R$ 0,00"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data do Investimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background/50",
                    !dataCriacao && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataCriacao ? format(dataCriacao, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataCriacao}
                  onSelect={(date) => date && setDataCriacao(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {investimento ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
