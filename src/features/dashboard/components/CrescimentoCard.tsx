import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InvestimentoItem {
  valor_investido?: number;
  lucro_proporcional?: number;
}

export function CrescimentoCard() {
  const [crescimentoBase, setCrescimentoBase] = useState<number | null>(null);
  const [crescimentoGanhos, setCrescimentoGanhos] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchSnapshots = async () => {
      setLoading(true);
      try {
        // Buscar empresa do usuário
        const { data: empresaData } = await supabase
          .from('empresa')
          .select('id')
          .single();

        if (!empresaData) {
          setLoading(false);
          return;
        }

        // Get last 12 months range
        const endDate = new Date();
        const startDate = startOfMonth(subMonths(endDate, 11));

        const { data: snapshots, error } = await supabase
          .from('vx_snapshots')
          .select('mes_referencia, saldo, investimento_atual')
          .eq('id_empresa', empresaData.id)
          .gte('mes_referencia', format(startDate, 'yyyy-MM-dd'))
          .order('mes_referencia', { ascending: true });

        if (error) throw error;

        if (!snapshots || snapshots.length < 2) {
          setCrescimentoBase(null);
          setCrescimentoGanhos(null);
          setLoading(false);
          return;
        }

        // Calculate values for each month
        const monthlyData = snapshots.map((snapshot) => {
          const investimentos = (snapshot.investimento_atual as InvestimentoItem[] | null) || [];
          const saldo = Number(snapshot.saldo) || 0;

          const totalInvestido = investimentos.reduce(
            (acc, inv) => acc + (Number(inv.valor_investido) || 0),
            0
          );

          const totalLucroProporcional = investimentos.reduce(
            (acc, inv) => acc + (Number(inv.lucro_proporcional) || 0),
            0
          );

          // Base: valor_investido + saldo
          const base = totalInvestido + saldo;

          return { base, totalInvestido, totalLucroProporcional };
        });

        // Calculate accumulated percentage growth for Base
        const firstMonth = monthlyData[0];
        
        if (firstMonth.base === 0) {
          setCrescimentoBase(null);
          setCrescimentoGanhos(null);
          setLoading(false);
          return;
        }

        let acumuladoBase = 0;

        for (let i = 1; i < monthlyData.length; i++) {
          const prevBase = monthlyData[i - 1].base;
          const currBase = monthlyData[i].base;

          if (prevBase > 0) {
            const variacaoBase = ((currBase - prevBase) / prevBase) * 100;
            acumuladoBase += variacaoBase;
          }
        }

        // Ganhos Previsto: percentual previsto de crescimento do patrimônio
        // Mesma base do Card 3 (Base = Investimentos + Saldo)
        // Crescimento previsto = (Lucro Proporcional Total / Base) × 100
        const lastMonth = monthlyData[monthlyData.length - 1];
        let ganhosPrevisto: number | null = null;

        if (lastMonth.base > 0) {
          ganhosPrevisto = (lastMonth.totalLucroProporcional / lastMonth.base) * 100;
        }

        setCrescimentoBase(acumuladoBase);
        setCrescimentoGanhos(ganhosPrevisto);
      } catch (error) {
        console.error('Erro ao buscar snapshots:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshots();
  }, []);

  const formatPercentage = (value: number | null) => {
    if (value === null) return '--%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const isPositive = crescimentoGanhos !== null && crescimentoGanhos >= 0;

  return (
    <div
      className={`relative bg-card rounded-xl p-4 shadow-lg border border-border/50 overflow-hidden transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isPositive ? 'bg-primary/10' : 'bg-destructive/10'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-primary" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
          </div>
          <span className="text-sm font-medium text-muted-foreground">Crescimento</span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1 rounded-full hover:bg-muted/50 transition-colors">
              <Info className="w-4 h-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm" side="left">
            <div className="space-y-2">
              <p className="font-medium">Como é calculado:</p>
              <div className="space-y-1 text-muted-foreground text-xs">
                <p><span className="font-medium text-[hsl(var(--chart-1))]">Base:</span> Crescimento acumulado do patrimônio (Investimentos + Saldo) nos últimos 12 meses.</p>
                <p><span className="font-medium text-[hsl(var(--chart-2))]">Ganhos Previsto:</span> Percentual previsto de crescimento = (Lucro Proporcional Total / Base) × 100</p>
              </div>
              <div className="border-t pt-2 mt-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Exemplo:</span><br />
                  Base: R$100K • Lucro Proporcional: R$15K<br />
                  <span className="font-medium">Ganhos Previsto: +15%</span>
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center py-4">
        {loading ? (
          <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
        ) : crescimentoBase === null && crescimentoGanhos === null ? (
          <p className="text-muted-foreground text-sm">Dados insuficientes</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-2">
              <span 
                className={`text-2xl font-bold ${
                  crescimentoBase !== null && crescimentoBase >= 0 
                    ? 'text-primary' 
                    : 'text-destructive'
                }`}
              >
                {formatPercentage(crescimentoBase)}
              </span>
              <span className="text-muted-foreground text-lg">/</span>
              <span 
                className={`text-2xl font-bold ${
                  crescimentoGanhos !== null && crescimentoGanhos >= 0 
                    ? 'text-primary' 
                    : 'text-destructive'
                }`}
              >
                {formatPercentage(crescimentoGanhos)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-1))]" />
                <span>Base</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-2))]" />
                <span>Ganhos Previsto</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Acumulado 12 meses
            </p>
          </>
        )}
      </div>
    </div>
  );
}
