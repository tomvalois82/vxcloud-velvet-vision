import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Dados fictícios para demonstração
const MOCK_DATA = [
  { mes: 'Jan', receitas: 45000, despesas: 32000, lucro: 13000 },
  { mes: 'Fev', receitas: 52000, despesas: 28000, lucro: 24000 },
  { mes: 'Mar', receitas: 48000, despesas: 35000, lucro: 13000 },
  { mes: 'Abr', receitas: 61000, despesas: 30000, lucro: 31000 },
  { mes: 'Mai', receitas: 55000, despesas: 33000, lucro: 22000 },
  { mes: 'Jun', receitas: 67000, despesas: 38000, lucro: 29000 },
];

export function TrendChart() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  return (
    <div 
      className={`bg-card/50 rounded-lg p-4 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Evolução Financeira <span className="text-xs opacity-60">(dados fictícios)</span>
      </h3>
      
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={MOCK_DATA} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.5} 
            />
            <XAxis 
              dataKey="mes" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [
                value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              ]}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="receitas"
              name="Receitas"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="despesas"
              name="Despesas"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="lucro"
              name="Lucro"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
