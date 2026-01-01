import { useMemo } from 'react';
import { GaugeChart } from './GaugeChart';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface BalancoGeralCardProps {
  totalReceitas: number;
  totalDespesasGeral: number;
  balancoGeral: number;
  loading?: boolean;
}

export function BalancoGeralCard({ totalReceitas, totalDespesasGeral, balancoGeral, loading }: BalancoGeralCardProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  };

  const { message, icon: Icon, colorClass } = useMemo(() => {
    if (balancoGeral < 0) {
      return {
        message: `Déficit de ${formatCurrency(Math.abs(balancoGeral))} no período`,
        icon: TrendingDown,
        colorClass: 'text-destructive',
      };
    }
    if (balancoGeral >= 0 && balancoGeral < 1) {
      return {
        message: 'Receitas e despesas em equilíbrio',
        icon: Minus,
        colorClass: 'text-muted-foreground',
      };
    }
    return {
      message: `Superávit de ${formatCurrency(balancoGeral)} no período`,
      icon: TrendingUp,
      colorClass: 'text-primary',
    };
  }, [balancoGeral]);

  // Calculate percentage: how much of expenses is covered by revenues
  const percentage = totalDespesasGeral > 0 
    ? Math.max(0, Math.min(200, (totalReceitas / totalDespesasGeral) * 100))
    : totalReceitas > 0 ? 100 : 0;

  if (loading) {
    return (
      <div className="flex-1 bg-card/50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-4" />
        <div className="flex justify-center">
          <div className="w-32 h-32 bg-muted rounded-full" />
        </div>
        <div className="h-3 bg-muted rounded w-full mt-4" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-card/50 rounded-lg p-4 transition-all duration-300 hover:bg-card/70">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Balanço Geral</h3>
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1 rounded-full hover:bg-muted/50 transition-colors">
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-sm" side="top" align="end">
            <div className="space-y-2">
              <p className="font-medium">Como é calculado o Balanço Geral?</p>
              <p className="text-muted-foreground">
                <strong>Balanço Geral</strong> = Total de Receitas - Total de Despesas
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Total de Receitas:</strong> Soma de todas as entradas (Receber) no período</p>
                <p><strong>Total de Despesas:</strong> Soma de todas as saídas (Pagar) no período</p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex justify-center">
        <GaugeChart
          value={percentage}
          minValue={0}
          maxValue={100}
          size={160}
        />
      </div>
      
      <div className={`flex items-center gap-2 mt-2 justify-center ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs text-center">{message}</span>
      </div>
      
      <div className="mt-4 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total receitas:</span>
          <span className="font-medium text-primary">{formatCurrency(totalReceitas)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total despesas:</span>
          <span className="font-medium text-destructive">{formatCurrency(totalDespesasGeral)}</span>
        </div>
      </div>
    </div>
  );
}
