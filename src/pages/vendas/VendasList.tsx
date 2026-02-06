import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
import {
  Search,
  Plus,
  Pencil,
  LockOpen,
  Lock,
  Loader2,
  ShoppingCart,
  Filter,
  X,
  CalendarIcon,
  Printer,
  FileText,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSalesList } from '@/features/vendas/hooks/useSalesList';
import { useSaleContract } from '@/features/vendas/hooks/useSaleContract';
import { SaleContract } from '@/features/vendas/components/SaleContract';
import { ProcuracaoDialog } from '@/features/administrativo/components/ProcuracaoDialog';
import { maskCurrency } from '@/features/estoque/utils/masks';

const VendasList = () => {
  const navigate = useNavigate();
  const {
    sales,
    loading,
    actionLoading,
    filters,
    colaboradores,
    updateFilters,
    reopenSale,
    closeSale,
  } = useSalesList();

  const { loading: contractLoading, contractData, fetchContractData } = useSaleContract();
  const contractRef = useRef<HTMLDivElement>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [printSaleId, setPrintSaleId] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<{
    id: string;
    vehicleId: number;
  } | null>(null);
  const [procuracaoData, setProcuracaoData] = useState<{
    clienteId: string;
    veiculoId: number;
  } | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: contractRef,
    documentTitle: `Contrato-${contractData?.id.slice(0, 8) || 'venda'}`,
    onAfterPrint: () => {
      setPrintSaleId(null);
    },
  });

  const handlePrintContract = async (saleId: string) => {
    setPrintSaleId(saleId);
    const data = await fetchContractData(saleId);
    if (data) {
      // Wait for state update and DOM render
      setTimeout(() => {
        handlePrint();
      }, 100);
    }
  };

  const handleReopenConfirm = async () => {
    if (selectedSale) {
      await reopenSale(selectedSale.id);
      setReopenDialogOpen(false);
      setSelectedSale(null);
    }
  };

  const handleCloseConfirm = async () => {
    if (selectedSale) {
      await closeSale(selectedSale.id, selectedSale.vehicleId);
      setCloseDialogOpen(false);
      setSelectedSale(null);
    }
  };

  const clearFilters = () => {
    updateFilters({
      search: '',
      status: 'all',
      vendedorId: null,
      dataInicio: null,
      dataFim: null,
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== 'all' ||
    filters.vendedorId ||
    filters.dataInicio ||
    filters.dataFim;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Vendas Realizadas"
        description="Gerencie todas as vendas registradas"
        action={
          <Button
            className="bg-accent hover:bg-accent/90"
            onClick={() => navigate('/veiculos/estoque')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Venda
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Search and Filters Bar */}
        <div className="glass rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, placa ou ID..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-10 bg-background/50"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'gap-2',
                hasActiveFilters && 'border-accent text-accent'
              )}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 bg-accent/20">
                  !
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Limpar
              </Button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
              {/* Status Filter */}
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

              {/* Seller Filter */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Vendedor
                </label>
                <Select
                  value={filters.vendedorId || 'all'}
                  onValueChange={(value) =>
                    updateFilters({
                      vendedorId: value === 'all' ? null : value,
                    })
                  }
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {colaboradores.map((colab) => (
                      <SelectItem key={colab.id} value={colab.id}>
                        {colab.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range - Start */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Data Início
                </label>
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
                        ? format(filters.dataInicio, 'dd/MM/yyyy', {
                            locale: ptBR,
                          })
                        : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dataInicio || undefined}
                      onSelect={(date) => updateFilters({ dataInicio: date || null })}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date Range - End */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Data Fim
                </label>
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
                      onSelect={(date) => updateFilters({ dataFim: date || null })}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        {/* Sales Table */}
        <div className="glass rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : sales.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ShoppingCart}
                title="Nenhuma venda encontrada"
                description={
                  hasActiveFilters
                    ? 'Tente ajustar os filtros para encontrar vendas.'
                    : 'Inicie uma nova venda a partir do estoque de veículos.'
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-muted-foreground">
                    ID
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Cliente
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Veículo
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Data
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Valor
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {sale.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {sale.cliente?.nome || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.cliente?.cpf_cnpj}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {sale.veiculo?.fabricante} {sale.veiculo?.modelo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.veiculo?.placa} • {sale.veiculo?.ano}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(sale.data_venda), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="font-semibold text-accent">
                      {maskCurrency(Number(sale.valor_total_venda))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={sale.fechada ? 'default' : 'secondary'}
                        className={cn(
                          sale.fechada
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        )}
                      >
                        {sale.fechada ? (
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
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Print Contract Button - Always visible */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrintContract(sale.id)}
                              disabled={printSaleId === sale.id || contractLoading}
                              className="gap-1"
                            >
                              {printSaleId === sale.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Printer className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Imprimir Contrato</TooltipContent>
                        </Tooltip>

                        {/* Procuração Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setProcuracaoData({
                                clienteId: sale.id_cliente,
                                veiculoId: sale.id_veiculo_vendido,
                              })}
                              className="gap-1"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Emitir Procuração</TooltipContent>
                        </Tooltip>

                        {sale.fechada ? (
                          <>
                            {/* Reopen Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSale({
                                      id: sale.id,
                                      vehicleId: sale.id_veiculo_vendido,
                                    });
                                    setReopenDialogOpen(true);
                                  }}
                                  disabled={actionLoading === sale.id}
                                  className="gap-1"
                                >
                                  {actionLoading === sale.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <LockOpen className="w-4 h-4" />
                                  )}
                                  Reabrir
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Reabrir venda para edição
                              </TooltipContent>
                            </Tooltip>

                            {/* Disabled Edit Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled
                                  className="gap-1 opacity-50"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Reabra a venda para poder editar
                              </TooltipContent>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            {/* Edit Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/vendas/editar?vendaId=${sale.id}`)
                                  }
                                  disabled={actionLoading === sale.id}
                                  className="gap-1"
                                >
                                  <Pencil className="w-4 h-4" />
                                  Editar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar venda</TooltipContent>
                            </Tooltip>

                            {/* Close Sale Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSale({
                                      id: sale.id,
                                      vehicleId: sale.id_veiculo_vendido,
                                    });
                                    setCloseDialogOpen(true);
                                  }}
                                  disabled={actionLoading === sale.id}
                                  className="gap-1 bg-green-600 hover:bg-green-700"
                                >
                                  {actionLoading === sale.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Lock className="w-4 h-4" />
                                  )}
                                  Fechar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Fechar venda</TooltipContent>
                            </Tooltip>
                          </>
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

      {/* Reopen Dialog */}
      <AlertDialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Ao reabrir, será possível editar novamente esta venda. Deseja
              continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReopenConfirm}
              className="bg-accent hover:bg-accent/90"
            >
              Reabrir Venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Dialog */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Ao fechar a venda, o veículo será marcado como vendido e a venda
              não poderá ser editada até ser reaberta. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseConfirm}
              className="bg-green-600 hover:bg-green-700"
            >
              Fechar Venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden Print Component */}
      <div className="hidden">
        <div ref={contractRef}>
          {contractData && <SaleContract data={contractData} />}
        </div>
      </div>

      {/* Procuração Dialog */}
      <ProcuracaoDialog
        open={!!procuracaoData}
        onOpenChange={(open) => { if (!open) setProcuracaoData(null); }}
        outorganteIdInicial={procuracaoData?.clienteId}
        veiculoIdInicial={procuracaoData?.veiculoId}
      />
    </div>
  );
};

export default VendasList;
