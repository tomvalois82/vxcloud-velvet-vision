import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Ban,
  CalendarIcon,
  Filter,
  Loader2,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { usePurchasesList, PaidMovement } from '@/features/compras/hooks/usePurchasesList';
import { maskCurrency } from '@/features/estoque/utils/masks';

const ComprasList = () => {
  const navigate = useNavigate();
  const {
    purchases,
    loading,
    actionLoading,
    filters,
    colaboradores,
    updateFilters,
    reopenPurchase,
    fetchPaidMovements,
    cancelPurchase,
  } = usePurchasesList();

  const [showFilters, setShowFilters] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  // Estado da seleção e do cancelamento
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetIds, setCancelTargetIds] = useState<string[]>([]);
  const [paidMovements, setPaidMovements] = useState<
    { idCompra: string; movimentos: PaidMovement[] }[]
  >([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Compras ainda não canceladas podem ser selecionadas
  const selecionaveis = purchases.filter(p => !p.cancelada);
  const allSelected =
    selecionaveis.length > 0 && selecionaveis.every(p => selectedIds.includes(p.id));

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? selecionaveis.map(p => p.id) : []);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => (checked ? [...prev, id] : prev.filter(item => item !== id)));
  };

  // Abre o diálogo de cancelamento carregando os títulos pagos das compras selecionadas
  const openCancelDialog = async (purchaseIds: string[]) => {
    setCancelTargetIds(purchaseIds);
    setCancelDialogOpen(true);
    setLoadingMovements(true);
    setPaidMovements([]);
    const resultados = await Promise.all(
      purchaseIds.map(async id => ({
        idCompra: id,
        movimentos: await fetchPaidMovements(id),
      }))
    );
    setPaidMovements(resultados);
    setLoadingMovements(false);
  };

  const totalPago = paidMovements.reduce(
    (acc, item) => acc + item.movimentos.reduce((soma, m) => soma + m.valor_liquido, 0),
    0
  );
  const temPago = paidMovements.some(item => item.movimentos.length > 0);

  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.status !== 'all' ||
    Boolean(filters.compradorId) ||
    Boolean(filters.dataInicio) ||
    Boolean(filters.dataFim);

  const clearFilters = () =>
    updateFilters({
      search: '',
      status: 'all',
      compradorId: null,
      dataInicio: null,
      dataFim: null,
    });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Compras realizadas"
        description="Gerencie todas as compras de veículos registradas"
        action={
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => openCancelDialog(selectedIds)}
                disabled={actionLoading !== null}
              >
                <Ban className="w-4 h-4 mr-2" />
                Cancelar selecionada{selectedIds.length > 1 ? 's' : ''} ({selectedIds.length})
              </Button>
            )}
            <Button className="bg-accent hover:bg-accent/90" onClick={() => navigate('/compras/nova')}>
              <Plus className="w-4 h-4 mr-2" />
              Nova compra
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <div className="glass rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por vendedor, placa ou ID..."
                value={filters.search}
                onChange={e => updateFilters({ search: e.target.value })}
                className="pl-10 bg-background/50"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn('gap-2', hasActiveFilters && 'border-accent text-accent')}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Limpar
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value: 'all' | 'open' | 'closed') =>
                    updateFilters({ status: value })
                  }
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="open">Abertas</SelectItem>
                    <SelectItem value="closed">Fechadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Comprador</label>
                <Select
                  value={filters.compradorId || 'all'}
                  onValueChange={value =>
                    updateFilters({ compradorId: value === 'all' ? null : value })
                  }
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {colaboradores.map(colab => (
                      <SelectItem key={colab.id} value={colab.id}>
                        {colab.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Data início</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-background/50',
                        !filters.dataInicio && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dataInicio
                        ? format(filters.dataInicio, 'dd/MM/yyyy', { locale: ptBR })
                        : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dataInicio || undefined}
                      onSelect={date => updateFilters({ dataInicio: date || null })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Data fim</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-background/50',
                        !filters.dataFim && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dataFim
                        ? format(filters.dataFim, 'dd/MM/yyyy', { locale: ptBR })
                        : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dataFim || undefined}
                      onSelect={date => updateFilters({ dataFim: date || null })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ShoppingBag}
                title="Nenhuma compra encontrada"
                description={
                  hasActiveFilters
                    ? 'Tente ajustar os filtros para encontrar compras.'
                    : 'Registre uma nova compra de veículo para começar.'
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={checked => toggleSelectAll(checked === true)}
                      aria-label="Selecionar todas"
                    />
                  </TableHead>
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground">Vendedor</TableHead>
                  <TableHead className="text-muted-foreground">Veículo</TableHead>
                  <TableHead className="text-muted-foreground">Data</TableHead>
                  <TableHead className="text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map(compra => (
                  <TableRow
                    key={compra.id}
                    className={cn(
                      'border-b border-border/50 hover:bg-muted/30 transition-colors',
                      compra.cancelada && 'opacity-50'
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(compra.id)}
                        disabled={Boolean(compra.cancelada)}
                        onCheckedChange={checked => toggleSelect(compra.id, checked === true)}
                        aria-label="Selecionar compra"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {compra.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {compra.fornecedor?.nome || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">{compra.fornecedor?.cpf_cnpj}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {compra.veiculo?.fabricante} {compra.veiculo?.modelo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {compra.veiculo?.placa} • {compra.veiculo?.ano}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(compra.data_compra), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-semibold text-accent">
                      {maskCurrency(compra.valor_total_compra)}
                    </TableCell>
                    <TableCell>
                      {compra.cancelada ? (
                        <Badge
                          variant="secondary"
                          className="bg-red-500/20 text-red-400 border-red-500/30"
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          Cancelada
                        </Badge>
                      ) : (
                      <Badge
                        variant={compra.fechada ? 'default' : 'secondary'}
                        className={cn(
                          compra.fechada
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        )}
                      >
                        {compra.fechada ? (
                          <>
                            <Lock className="w-3 h-3 mr-1" />
                            Fechada
                          </>
                        ) : (
                          <>
                            <LockOpen className="w-3 h-3 mr-1" />
                            Aberta
                          </>
                        )}
                      </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {compra.fechada ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPurchaseId(compra.id);
                                  setReopenDialogOpen(true);
                                }}
                                disabled={actionLoading === compra.id}
                                className="gap-1"
                              >
                                {actionLoading === compra.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <LockOpen className="w-4 h-4" />
                                )}
                                Reabrir
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reabrir compra para edição</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/compras/editar?compraId=${compra.id}`)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar compra</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <AlertDialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir compra?</AlertDialogTitle>
            <AlertDialogDescription>
              A compra voltará para o status aberta e poderá ser editada novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedPurchaseId) {
                  await reopenPurchase(selectedPurchaseId);
                }
                setReopenDialogOpen(false);
                setSelectedPurchaseId(null);
              }}
            >
              Reabrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancelar compra{cancelTargetIds.length > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTargetIds.length > 1
                ? `As ${cancelTargetIds.length} compras selecionadas serão canceladas.`
                : 'A compra selecionada será cancelada.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {loadingMovements ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : (
            temPago && (
              <div className="space-y-3">
                <p className="text-sm text-foreground font-medium">
                  Existe(m) movimento(s) financeiro(s) pago(s) atrelado(s) a esta compra:
                </p>
                <div className="max-h-48 overflow-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="text-muted-foreground">Descrição</TableHead>
                        <TableHead className="text-muted-foreground">Vencimento</TableHead>
                        <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidMovements.flatMap(item =>
                        item.movimentos.map(mov => (
                          <TableRow key={mov.id} className="border-b border-border/50">
                            <TableCell className="text-xs">
                              {mov.descricao || 'Sem descrição'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(mov.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold text-accent">
                              {maskCurrency(mov.valor_liquido)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground">
                  Será lançado um título "a Receber" com a soma dos títulos pagos (
                  <span className="font-semibold text-accent">{maskCurrency(totalPago)}</span>) e os
                  títulos pendentes de pagamento serão excluídos.
                </p>
              </div>
            )
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={loadingMovements}
              onClick={async () => {
                for (const id of cancelTargetIds) {
                  await cancelPurchase(id);
                }
                setSelectedIds([]);
                setCancelDialogOpen(false);
                setCancelTargetIds([]);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComprasList;
