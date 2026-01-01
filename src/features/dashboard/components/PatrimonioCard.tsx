import { useEffect, useState } from 'react';
import { PiggyBank, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SnapshotData {
  mes: string;
  base: number;
  ganhosPrevisto: number;
}

interface InvestimentoItem {
  valor_investido?: number;
  lucro_proporcional?: number;
}

export function PatrimonioCard() {
  const [data, setData] = useState<SnapshotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 400);
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

        const chartData: SnapshotData[] = (snapshots || []).map((snapshot) => {
          const investimentos = (snapshot.investimento_atual as InvestimentoItem[] | null) || [];
          const saldo = Number(snapshot.saldo) || 0;

          // Sum of valor_investido from all investments
          const totalInvestido = investimentos.reduce(
            (acc, inv) => acc + (Number(inv.valor_investido) || 0),
            0
          );

          // Sum of lucro_proporcional from all investments
          const totalLucroProporcional = investimentos.reduce(
            (acc, inv) => acc + (Number(inv.lucro_proporcional) || 0),
            0
          );

          // Base: valor_investido + saldo
          const base = totalInvestido + saldo;

          // Ganhos Previsto: valor_investido + lucro_proporcional + saldo
          const ganhosPrevisto = totalInvestido + totalLucroProporcional + saldo;

          return {
            mes: format(new Date(snapshot.mes_referencia), 'MMM/yy', { locale: ptBR }),
            base,
            ganhosPrevisto,
          };
        });

        setData(chartData);
      } catch (error) {
        console.error('Erro ao buscar snapshots:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshots();
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  const formatTooltipValue = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Get latest values for display
  const latestData = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div
      className={`relative bg-card rounded-xl p-4 shadow-lg border border-border/50 overflow-hidden transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <PiggyBank className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Patrimônio</span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1 rounded-full hover:bg-muted/50 transition-colors">
              <Info className="w-4 h-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-sm" side="left">
            <div className="space-y-2">
              <p className="font-medium">Como é calculado:</p>
              <div className="space-y-1 text-muted-foreground text-xs">
                <p><span className="font-medium text-[hsl(var(--chart-1))]">Base:</span> Soma dos investimentos + Saldo em caixa</p>
                <p><span className="font-medium text-[hsl(var(--chart-2))]">Ganhos Previsto:</span> Base + Lucro proporcional dos investimentos</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Dados dos últimos 12 meses de snapshots.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Current Value */}
      {latestData && !loading && (
        <div className="mb-3">
          <p className="text-xl font-bold text-foreground">
            {formatTooltipValue(latestData.ganhosPrevisto)}
          </p>
          <p className="text-xs text-muted-foreground">
            Base: {formatTooltipValue(latestData.base)}
          </p>
        </div>
      )}

      {/* Chart */}
      <div className="h-[120px] w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">Sem dados de snapshots</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="colorGanhos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="mes"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  formatTooltipValue(value),
                  name === 'base' ? 'Base' : 'Ganhos Previsto',
                ]}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '10px' }}
                formatter={(value) => (value === 'base' ? 'Base' : 'Ganhos Previsto')}
              />
              <Area
                type="monotone"
                dataKey="ganhosPrevisto"
                name="ganhosPrevisto"
                stroke="hsl(var(--chart-2))"
                fill="url(#colorGanhos)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="base"
                name="base"
                stroke="hsl(var(--chart-1))"
                fill="url(#colorBase)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
