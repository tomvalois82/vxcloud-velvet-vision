import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  TrendingUp,
  Wallet,
  CreditCard,
  Car,
  ShoppingCart,
  PiggyBank,
} from "lucide-react";

interface EstoqueItem {
  id: number;
  fabricante: string;
  modelo: string;
  motor: string;
  cambio: string;
  ano: string;
  valor_aquisicao: number;
  custos_preparacao: number;
  custo_final: number;
  valor_venda: number;
  lucro_estimado: number;
  margem_percentual: number;
  dias_em_estoque: number;
}

interface VendaItem {
  id_venda: string;
  cliente: string;
  veiculo: string;
  data_venda: string;
  valor_total_venda: number;
}

interface InvestimentoItem {
  id_estoque: number;
  veiculo: string;
  valor: number;
  valor_aquisicao: number;
  valor_investido: number;
  percentual_investido: number;
  custo_total: number;
  custo_proporcional: number;
  lucro_veiculo: number;
  lucro_proporcional: number;
  margem: number;
  margem_proporcional: number;
  data_finalizado: string | null;
  tipo: "estimado" | "consolidado";
}

interface Snapshot {
  id: string;
  id_empresa: string;
  mes_referencia: string;
  total_estoque: number;
  total_estimado: number;
  saldo: number;
  contas_a_receber: number;
  estoque_atual: EstoqueItem[];
  venda_atual?: VendaItem[];
  investimento_atual?: InvestimentoItem[];
  created_at: string;
}

interface SnapshotDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: Snapshot | null;
}

export const SnapshotDetailDialog = ({
  open,
  onOpenChange,
  snapshot,
}: SnapshotDetailDialogProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatMonth = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  if (!snapshot) return null;

  const estoqueAtual = Array.isArray(snapshot.estoque_atual) ? snapshot.estoque_atual : [];
  const vendaAtual = Array.isArray(snapshot.venda_atual) ? snapshot.venda_atual : [];
  const investimentoAtual = Array.isArray(snapshot.investimento_atual) ? snapshot.investimento_atual : [];

  const valorInvestido = investimentoAtual.reduce((acc, inv) => acc + (inv.valor_investido || 0), 0);
  const lucroEstimado = investimentoAtual.reduce((acc, inv) => acc + (inv.lucro_proporcional || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detalhes do Snapshot
          </DialogTitle>
          <DialogDescription>
            Fotografia patrimonial e financeira
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pb-4">
          {/* Mês de Referência */}
          <div className="text-center">
            <Badge variant="secondary" className="text-base px-4 py-1 capitalize">
              {formatMonth(snapshot.mes_referencia)}
            </Badge>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PiggyBank className="w-4 h-4" />
                  Valor Investido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(valorInvestido)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Lucro Estimado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-emerald-500">
                  {formatCurrency(lucroEstimado)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Saldo em Contas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-blue-500">
                  {formatCurrency(snapshot.saldo)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  A Receber
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-amber-500">
                  {formatCurrency(snapshot.contas_a_receber)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Investments Table */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <PiggyBank className="w-4 h-4" />
                Investimentos da Loja ({investimentoAtual.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead className="text-right">Investido</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Custo Prop.</TableHead>
                      <TableHead className="text-right">Lucro Prop.</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                      <TableHead className="text-center">Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investimentoAtual.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum investimento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      investimentoAtual.map((inv, index) => (
                        <TableRow key={inv.id_estoque || index}>
                          <TableCell>
                            <div className="max-w-[200px] truncate font-medium" title={inv.veiculo}>
                              {inv.veiculo}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(inv.valor_investido)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{inv.percentual_investido}%</Badge>
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {formatCurrency(inv.custo_proporcional)}
                          </TableCell>
                          <TableCell className={`text-right ${inv.lucro_proporcional >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                            {formatCurrency(inv.lucro_proporcional)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={inv.margem_proporcional >= 20 ? "default" : "secondary"}
                              className={
                                inv.margem_proporcional >= 20
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : ""
                              }
                            >
                              {inv.margem_proporcional?.toFixed(1) || "0.0"}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={inv.tipo === "consolidado" ? "default" : "secondary"}>
                              {inv.tipo === "consolidado" ? "Consolidado" : "Estimado"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Vehicles Table */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Car className="w-4 h-4" />
                Veículos em Estoque ({estoqueAtual.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead className="text-right">Aquisição</TableHead>
                      <TableHead className="text-right">Custos</TableHead>
                      <TableHead className="text-right">Venda</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                      <TableHead className="text-right">Dias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estoqueAtual.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum veículo em estoque
                        </TableCell>
                      </TableRow>
                    ) : (
                      estoqueAtual.map((veiculo, index) => (
                        <TableRow key={veiculo.id || index}>
                          <TableCell>
                            <div className="font-medium">
                              {veiculo.fabricante} {veiculo.modelo}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {veiculo.ano} • {veiculo.motor} • {veiculo.cambio}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(veiculo.valor_aquisicao)}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {formatCurrency(veiculo.custos_preparacao)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(veiculo.valor_venda)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-500">
                            {formatCurrency(veiculo.lucro_estimado)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={veiculo.margem_percentual >= 20 ? "default" : "secondary"}
                              className={
                                veiculo.margem_percentual >= 20
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : ""
                              }
                            >
                              {veiculo.margem_percentual?.toFixed(1) || "0.0"}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{veiculo.dias_em_estoque}d</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Sales Table */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Vendas do Mês ({vendaAtual.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead className="text-right">Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendaAtual.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhuma venda realizada no mês
                        </TableCell>
                      </TableRow>
                    ) : (
                      vendaAtual.map((venda, index) => (
                        <TableRow key={venda.id_venda || index}>
                          <TableCell>
                            <div className="font-medium max-w-[200px] truncate" title={venda.cliente}>
                              {venda.cliente}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[250px] truncate text-muted-foreground" title={venda.veiculo}>
                              {venda.veiculo}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {format(new Date(venda.data_venda), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-500">
                            {formatCurrency(venda.valor_total_venda)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
