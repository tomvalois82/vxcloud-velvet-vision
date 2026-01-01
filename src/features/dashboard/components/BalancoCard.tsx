import { useMemo } from 'react';
import { GaugeChart } from './GaugeChart';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

  const formatGaugeValue = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      return `${(value / 1000000).toFixed(1)}Mi`;
    }
    if (absValue >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
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

  // Calculate gauge limits based on values
  const maxValue = Math.max(Math.abs(balanco), totalDespesas, lucroVendas, 1000) * 1.2;
  const minValue = balanco < 0 ? balanco * 1.2 : 0;

  if (loading) {
    return (
      <div className="flex-1 bg-card/50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-20 mb-4" />
        <div className="flex justify-center">
          <div className="w-32 h-16 bg-muted rounded-full" />
        </div>
        <div className="h-3 bg-muted rounded w-full mt-4" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-card/50 rounded-lg p-4 transition-all duration-300 hover:bg-card/70">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">Balanço</h3>
      
      <div className="flex justify-center">
        <GaugeChart
          value={balanco}
          minValue={minValue}
          maxValue={maxValue}
          formatValue={formatGaugeValue}
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
