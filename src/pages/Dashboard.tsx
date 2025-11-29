import { PageHeader } from "@/components/PageHeader";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Users, ShoppingCart, TrendingUp } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Visão geral do sistema"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Veículos em Estoque"
          value="--"
          icon={Car}
        />
        <StatsCard
          title="Clientes Ativos"
          value="--"
          icon={Users}
        />
        <StatsCard
          title="Vendas do Mês"
          value="--"
          icon={ShoppingCart}
        />
        <StatsCard
          title="Receita Total"
          value="R$ --"
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-center py-8">
              Nenhuma venda registrada
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-center py-8">
              Nenhuma atividade recente
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
