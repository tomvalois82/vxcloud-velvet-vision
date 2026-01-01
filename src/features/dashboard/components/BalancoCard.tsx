import { useMemo, useState } from 'react';
import { GaugeChart } from './GaugeChart';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface BalancoCardProps {
  totalDespesas: number;
  lucroVendas: number;
  balanco: number;
  loading?: boolean;
}

export function BalancoCard({ totalDespesas, lucroVendas, balanco, loading }: BalancoCardProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  };

  const { status, message, icon: Icon, colorClass } = useMemo(() => {
    if (balanco < 0) {
      return {
        status: 'deficit',
        message: `Falta ${formatCurrency(Math.abs(balanco))} para equilíbrio no período`,
        icon: TrendingDown,
        colorClass: 'text-destructive',
      };
    }
    if (balanco >= 0 && balanco < 1) {
      return {
        status: 'equilibrio',
        message: 'A Loja está em equilíbrio',
        icon: Minus,
        colorClass: 'text-muted-foreground',
      };
    }
    return {
      status: 'crescimento',
      message: `A loja cresceu ${formatCurrency(balanco)} nesse período`,
      icon: TrendingUp,
      colorClass: 'text-primary',
    };
  }, [balanco]);

  // Calculate percentage: how much of expenses is covered by sales profit
  // 100% = lucro covers all expenses, 0% = no coverage
  const percentage = totalDespesas > 0 
    ? Math.max(0, Math.min(200, (lucroVendas / totalDespesas) * 100))
    : lucroVendas > 0 ? 100 : 0;

  if (loading) {
    return (
      <div className="flex-1 bg-card/50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-20 mb-4" />
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
        <h3 className="text-sm font-medium text-muted-foreground">Balanço</h3>
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1 rounded-full hover:bg-muted/50 transition-colors">
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-sm" side="top" align="end">
            <div className="space-y-2">
              <p className="font-medium">Como é calculado o Balanço?</p>
              <p className="text-muted-foreground">
                <strong>Balanço</strong> = Lucro das Vendas - Total de Despesas
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Lucro das Vendas:</strong> Valor total das vendas + serviços/produtos - custos dos veículos vendidos</p>
                <p><strong>Total de Despesas:</strong> Soma das despesas do período (exceto compras de veículos)</p>
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
          <span className="text-muted-foreground">Lucro das vendas:</span>
          <span className="font-medium text-primary">{formatCurrency(lucroVendas)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total despesas:</span>
          <span className="font-medium text-destructive">{formatCurrency(totalDespesas)}</span>
        </div>
      </div>
    </div>
  );
}
