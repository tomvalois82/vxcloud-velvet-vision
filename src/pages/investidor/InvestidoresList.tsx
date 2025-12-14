import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/EmptyState';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { InvestimentoDialog } from '@/features/investidor/components/InvestimentoDialog';

interface Investimento {
  id: string;
  id_pessoa: string;
  id_estoque: number;
  percentual_investido: number;
  valor_investido: number;
  data_criacao: string;
  data_finalizado: string | null;
  id_grupo_wtz: string | null;
  pessoa?: {
    nome: string;
  };
  veiculo?: {
    id: number;
    placa: string | null;
    modelo: string | null;
    motor: string | null;
    cambio: string | null;
    ano: string | null;
    cor: string | null;
    valor_aquisicao: number;
    valor: string | null;
  };
  custos_veiculo?: number;
}

interface InvestimentoComCalculos extends Investimento {
  custos_proporcionais: number;
  rentabilidade_proporcional: number;
  lucro_percentual: number;
}

export default function InvestidoresList() {
  const [investimentos, setInvestimentos] = useState<InvestimentoComCalculos[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvestimento, setSelectedInvestimento] = useState<Investimento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [investimentoToDelete, setInvestimentoToDelete] = useState<Investimento | null>(null);

  const fetchInvestimentos = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar investimentos com dados de pessoa e veículo
      const { data: investimentosData, error } = await supabase
        .from('vx_investimento')
        .select(`
          *,
          pessoa:vx_pessoa(nome),
          veiculo:estoque(id, placa, modelo, motor, cambio, ano, cor, valor_aquisicao, valor)
        `)
        .order('data_criacao', { ascending: false });

      if (error) throw error;

      // Para cada investimento, buscar custos do veículo
      const investimentosComCalculos: InvestimentoComCalculos[] = await Promise.all(
        (investimentosData || []).map(async (inv) => {
          // Buscar custos do veículo (despesas/pagar)
          const { data: custosData } = await supabase
            .from('vx_fin_movimento')
            .select('valor_bruto, desconto, acrescimo, status')
            .eq('id_estoque', inv.id_estoque)
            .eq('tipo_movimento', 'Pagar');

          // Calcular total de custos do veículo
          const totalCustos = (custosData || []).reduce((acc, mov) => {
            if (mov.status === 'Pago') {
              return acc + Number(mov.valor_bruto) - Number(mov.desconto || 0) + Number(mov.acrescimo || 0);
            }
            return acc + Number(mov.valor_bruto);
          }, 0);

          const percentual = inv.percentual_investido / 100;
          const valorVenda = inv.veiculo?.valor ? parseFloat(inv.veiculo.valor.replace(/[^\d,.-]/g, '').replace(',', '.')) : 0;
          const valorCompra = inv.veiculo?.valor_aquisicao || 0;

          // Custos proporcionais
          const custos_proporcionais = totalCustos * percentual;

          // Rentabilidade proporcional
          const valor_venda_proporcional = valorVenda * percentual;
          const valor_compra_proporcional = valorCompra * percentual;
          const rentabilidade_proporcional = valor_venda_proporcional - custos_proporcionais - valor_compra_proporcional;

          // Lucro percentual
          const lucro_percentual = inv.valor_investido > 0 
            ? (rentabilidade_proporcional / inv.valor_investido) * 100 
            : 0;

          return {
            ...inv,
            custos_veiculo: totalCustos,
            custos_proporcionais,
            rentabilidade_proporcional,
            lucro_percentual,
          };
        })
      );

      setInvestimentos(investimentosComCalculos);
    } catch (error) {
      console.error('Erro ao buscar investimentos:', error);
      toast.error('Erro ao carregar investimentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestimentos();

    // Subscription para atualizações em tempo real
    const channel = supabase
      .channel('investimentos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vx_investimento' }, fetchInvestimentos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vx_fin_movimento' }, fetchInvestimentos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque' }, fetchInvestimentos)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInvestimentos]);

  const handleEdit = (investimento: Investimento) => {
    setSelectedInvestimento(investimento);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!investimentoToDelete) return;

    try {
      const { error } = await supabase
        .from('vx_investimento')
        .delete()
        .eq('id', investimentoToDelete.id);

      if (error) throw error;

      toast.success('Investimento excluído com sucesso!');
      fetchInvestimentos();
    } catch (error) {
      console.error('Erro ao excluir investimento:', error);
      toast.error('Erro ao excluir investimento');
    } finally {
      setDeleteDialogOpen(false);
      setInvestimentoToDelete(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatVehicleInfo = (veiculo: Investimento['veiculo']) => {
    if (!veiculo) return '-';
    const parts = [
      veiculo.placa || '',
      '-',
      veiculo.modelo || '',
      veiculo.motor || '',
      veiculo.cambio || '',
      '-',
      veiculo.ano || '',
      '-',
      veiculo.cor || '',
    ].filter(p => p && p !== '-');
    
    return `${veiculo.placa || 'S/P'} - ${veiculo.modelo || ''} ${veiculo.motor || ''} ${veiculo.cambio || ''} - ${veiculo.ano || ''} - ${veiculo.cor || ''}`;
  };

  const filteredInvestimentos = investimentos.filter((inv) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      inv.pessoa?.nome?.toLowerCase().includes(searchLower) ||
      inv.veiculo?.modelo?.toLowerCase().includes(searchLower) ||
      inv.veiculo?.placa?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investidores"
        description="Gerencie os investimentos em veículos"
        action={
          <Button onClick={() => { setSelectedInvestimento(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Investimento
          </Button>
        }
      />

      <Card className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por investidor, veículo ou placa..."
            className="pl-10 bg-background/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredInvestimentos.length === 0 ? (
        <EmptyState
          title="Nenhum investimento encontrado"
          description={searchTerm ? 'Tente uma busca diferente' : 'Cadastre seu primeiro investimento'}
          icon={TrendingUp}
        />
      ) : (
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Investidor</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead className="text-right">Compra</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Investido</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-right">Custos Prop.</TableHead>
                  <TableHead className="text-right">Rentabilidade</TableHead>
                  <TableHead className="text-right">Lucro %</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvestimentos.map((inv) => {
                  const valorVenda = inv.veiculo?.valor 
                    ? parseFloat(inv.veiculo.valor.replace(/[^\d,.-]/g, '').replace(',', '.')) 
                    : 0;

                  return (
                    <TableRow key={inv.id} className="border-border/50 hover:bg-muted/30">
                      <TableCell className="font-medium">{inv.pessoa?.nome || '-'}</TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                        {formatVehicleInfo(inv.veiculo)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(inv.veiculo?.valor_aquisicao || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(valorVenda)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(inv.valor_investido)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="px-2 py-1 rounded-full bg-accent/20 text-accent text-sm">
                          {inv.percentual_investido}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(inv.custos_proporcionais)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={inv.rentabilidade_proporcional >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatCurrency(inv.rentabilidade_proporcional)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inv.lucro_percentual >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className={inv.lucro_percentual >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {inv.lucro_percentual.toFixed(2)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(inv)}
                            className="hover:text-accent"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setInvestimentoToDelete(inv); setDeleteDialogOpen(true); }}
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <InvestimentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investimento={selectedInvestimento}
        onSuccess={fetchInvestimentos}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este investimento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
