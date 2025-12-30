import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Package,
  TrendingUp,
  Wallet,
  CreditCard,
  Car,
  Loader2,
  ShoppingCart,
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

interface SnapshotData {
  mes_referencia: string;
  total_estoque: number;
  total_estimado: number;
  saldo: number;
  contas_a_receber: number;
  estoque_atual: EstoqueItem[];
  venda_atual: VendaItem[];
}

interface CriarSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  onSuccess: () => void;
}

export const CriarSnapshotDialog = ({
  open,
  onOpenChange,
  empresaId,
  onSuccess,
}: CriarSnapshotDialogProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [snapshotData, setSnapshotData] = useState<SnapshotData | null>(null);

  useEffect(() => {
    if (open && empresaId) {
      calculateSnapshot();
    }
  }, [open, empresaId]);

  const calculateSnapshot = async () => {
    setIsLoading(true);
    try {
      // Get empresa CNPJ to find the loja's pessoa
      const { data: empresa } = await supabase
        .from("empresa")
        .select("cnpj")
        .eq("id", empresaId)
        .single();

      if (!empresa?.cnpj) {
        toast.error("CNPJ da empresa não encontrado");
        setIsLoading(false);
        return;
      }

      // Find the loja's pessoa by matching CNPJ
      const { data: lojaPessoa } = await supabase
        .from("vx_pessoa")
        .select("id")
        .eq("cpf_cnpj", empresa.cnpj)
        .eq("id_empresa", empresaId)
        .single();

      // Get all vehicles in stock (status = 'Em estoque' or 'Em preparação')
      const { data: veiculos } = await supabase
        .from("estoque")
        .select("*")
        .eq("id_empresa", empresaId)
        .or("status.eq.Em estoque,status.eq.Em preparação");

      // Get all investments for the loja (if found)
      let investimentosLoja: { id_estoque: number; valor_investido: number; percentual_investido: number }[] = [];
      if (lojaPessoa) {
        const { data: investimentos } = await supabase
          .from("vx_investimento")
          .select("id_estoque, valor_investido, percentual_investido")
          .eq("id_pessoa", lojaPessoa.id)
          .is("data_finalizado", null);
        
        investimentosLoja = investimentos || [];
      }

      // Get all costs (pagar movements) for vehicles in stock
      const veiculoIds = veiculos?.map((v) => v.id) || [];
      let custosPorVeiculo: Record<number, number> = {};
      
      if (veiculoIds.length > 0) {
        const { data: movimentos } = await supabase
          .from("vx_fin_movimento")
          .select("id_estoque, valor_liquido")
          .eq("id_empresa", empresaId)
          .eq("tipo_movimento", "Pagar")
          .in("id_estoque", veiculoIds);

        if (movimentos) {
          for (const mov of movimentos) {
            if (mov.id_estoque) {
              custosPorVeiculo[mov.id_estoque] = (custosPorVeiculo[mov.id_estoque] || 0) + Number(mov.valor_liquido || 0);
            }
          }
        }
      }

      // Calculate estoque_atual
      const estoqueAtual: EstoqueItem[] = [];
      let totalEstoque = 0;
      let totalEstimado = 0;

      for (const veiculo of veiculos || []) {
        const valorAquisicao = Number(veiculo.valor_aquisicao) || 0;
        const custosPreparacao = custosPorVeiculo[veiculo.id] || 0;
        const custoFinal = valorAquisicao + custosPreparacao;
        const valorVenda = Number(veiculo.valor?.replace(/[^\d,]/g, "").replace(",", ".") || 0) || 0;
        const lucroEstimado = valorVenda - custoFinal;
        const margemPercentual = custoFinal > 0 ? (lucroEstimado / custoFinal) * 100 : 0;
        
        // Calculate days in stock
        const dataAquisicao = veiculo.data_aquisicao 
          ? new Date(veiculo.data_aquisicao) 
          : new Date(veiculo.created_at);
        const diasEmEstoque = Math.floor(
          (new Date().getTime() - dataAquisicao.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Find investment for this vehicle
        const investimento = investimentosLoja.find((inv) => inv.id_estoque === veiculo.id);
        
        if (investimento) {
          const percentual = investimento.percentual_investido / 100;
          const custoProporcional = custosPreparacao * percentual;
          const rentabilidadeProporcional = (valorVenda - custoFinal) * percentual;
          
          // Loja's portion: valor_investido + rentabilidade proporcional
          totalEstoque += investimento.valor_investido + rentabilidadeProporcional;
          totalEstimado += rentabilidadeProporcional;
        } else {
          // If no investment record, consider 100% as loja's
          totalEstoque += custoFinal;
          totalEstimado += lucroEstimado;
        }

        estoqueAtual.push({
          id: veiculo.id,
          fabricante: veiculo.fabricante || "",
          modelo: veiculo.modelo || "",
          motor: veiculo.motor || "",
          cambio: veiculo.cambio || "",
          ano: `${veiculo.ano_fabricacao || ""}/${veiculo.ano || ""}`.replace(/^\/|\/$/g, ""),
          valor_aquisicao: valorAquisicao,
          custos_preparacao: custosPreparacao,
          custo_final: custoFinal,
          valor_venda: valorVenda,
          lucro_estimado: lucroEstimado,
          margem_percentual: Math.round(margemPercentual * 100) / 100,
          dias_em_estoque: diasEmEstoque,
        });
      }

      // Get saldo from all accounts
      const { data: contas } = await supabase
        .from("vx_fin_conta")
        .select("saldo")
        .eq("id_empresa", empresaId);

      const saldo = contas?.reduce((acc, conta) => acc + Number(conta.saldo || 0), 0) || 0;

      // Get contas a receber (Receber movements not paid)
      const { data: receber } = await supabase
        .from("vx_fin_movimento")
        .select("valor_liquido")
        .eq("id_empresa", empresaId)
        .eq("tipo_movimento", "Receber")
        .neq("status", "Pago");

      const contasAReceber = receber?.reduce((acc, mov) => acc + Number(mov.valor_liquido || 0), 0) || 0;

      // Get sales from current month (fechada = true)
      const mesReferencia = format(new Date(), "yyyy-MM-dd");
      const inicioMes = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
      const fimMes = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd");

      const { data: vendas } = await supabase
        .from("vx_vendas")
        .select(`
          id,
          data_venda,
          valor_total_venda,
          id_cliente,
          id_veiculo_vendido
        `)
        .eq("id_empresa", empresaId)
        .eq("fechada", true)
        .gte("data_venda", inicioMes)
        .lte("data_venda", fimMes + "T23:59:59");

      // Fetch client and vehicle data for each sale
      const vendaAtual: VendaItem[] = [];
      
      if (vendas && vendas.length > 0) {
        const clienteIds = [...new Set(vendas.map(v => v.id_cliente))];
        const veiculoIds = [...new Set(vendas.map(v => v.id_veiculo_vendido))];

        const { data: clientes } = await supabase
          .from("vx_pessoa")
          .select("id, nome, cpf_cnpj, telefone")
          .in("id", clienteIds);

        const { data: veiculosVendidos } = await supabase
          .from("estoque")
          .select("id, fabricante, modelo, motor, cambio, ano_fabricacao, ano, cor, placa")
          .in("id", veiculoIds);

        const clienteMap = new Map(clientes?.map(c => [c.id, c]) || []);
        const veiculoMap = new Map(veiculosVendidos?.map(v => [v.id, v]) || []);

        for (const venda of vendas) {
          const cliente = clienteMap.get(venda.id_cliente);
          const veiculoVendido = veiculoMap.get(venda.id_veiculo_vendido);

          const clienteStr = cliente 
            ? `${cliente.nome}${cliente.cpf_cnpj ? ` (${cliente.cpf_cnpj})` : ""}${cliente.telefone ? ` - ${cliente.telefone}` : ""}`
            : "Cliente não encontrado";

          const veiculoStr = veiculoVendido
            ? `${veiculoVendido.fabricante || ""} ${veiculoVendido.modelo || ""} ${veiculoVendido.motor || ""} ${veiculoVendido.cambio || ""} ${veiculoVendido.ano_fabricacao || ""}/${veiculoVendido.ano || ""} ${veiculoVendido.cor || ""}${veiculoVendido.placa ? ` (Placa: ${veiculoVendido.placa})` : ""}`.trim()
            : "Veículo não encontrado";

          vendaAtual.push({
            id_venda: venda.id,
            cliente: clienteStr,
            veiculo: veiculoStr,
            data_venda: venda.data_venda,
            valor_total_venda: Number(venda.valor_total_venda) || 0,
          });
        }
      }

      // Set snapshot data
      setSnapshotData({
        mes_referencia: mesReferencia,
        total_estoque: totalEstoque,
        total_estimado: totalEstimado,
        saldo,
        contas_a_receber: contasAReceber,
        estoque_atual: estoqueAtual,
        venda_atual: vendaAtual,
      });
    } catch (error) {
      console.error("Erro ao calcular snapshot:", error);
      toast.error("Erro ao calcular snapshot");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!snapshotData) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from("vx_snapshots").insert([{
        id_empresa: empresaId,
        mes_referencia: snapshotData.mes_referencia,
        total_estoque: snapshotData.total_estoque,
        total_estimado: snapshotData.total_estimado,
        saldo: snapshotData.saldo,
        contas_a_receber: snapshotData.contas_a_receber,
        estoque_atual: snapshotData.estoque_atual as unknown as Json,
        venda_atual: snapshotData.venda_atual as unknown as Json,
      }]);

      if (error) throw error;

      toast.success("Snapshot criado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar snapshot:", error);
      toast.error("Erro ao criar snapshot");
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Criar Snapshot
          </DialogTitle>
          <DialogDescription>
            Fotografia patrimonial e financeira do mês atual
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-48" />
          </div>
        ) : snapshotData ? (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Mês de Referência */}
            <div className="text-center">
              <Badge variant="secondary" className="text-base px-4 py-1 capitalize">
                {formatMonth(snapshotData.mes_referencia)}
              </Badge>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Valor em Estoque
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(snapshotData.total_estoque)}
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
                    {formatCurrency(snapshotData.total_estimado)}
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
                    {formatCurrency(snapshotData.saldo)}
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
                    {formatCurrency(snapshotData.contas_a_receber)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Vehicles Table */}
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Veículos em Estoque ({snapshotData.estoque_atual.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-[250px]">
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
                      {snapshotData.estoque_atual.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Nenhum veículo em estoque
                          </TableCell>
                        </TableRow>
                      ) : (
                        snapshotData.estoque_atual.map((veiculo) => (
                          <TableRow key={veiculo.id}>
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
                                {veiculo.margem_percentual.toFixed(1)}%
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
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Sales Table */}
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Vendas do Mês ({snapshotData.venda_atual.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-[200px]">
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
                      {snapshotData.venda_atual.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Nenhuma venda realizada no mês
                          </TableCell>
                        </TableRow>
                      ) : (
                        snapshotData.venda_atual.map((venda) => (
                          <TableRow key={venda.id_venda}>
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
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Erro ao carregar dados do snapshot
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || isSaving || !snapshotData}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
