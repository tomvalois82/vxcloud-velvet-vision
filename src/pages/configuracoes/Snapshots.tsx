import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Eye, Calendar, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";

interface Snapshot {
  id: string;
  id_empresa: string;
  mes_referencia: string;
  total_estoque: number;
  total_estimado: number;
  saldo: number;
  contas_a_receber: number;
  estoque_atual: unknown[];
  created_at: string;
}

const Snapshots = () => {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch empresa ID on mount
  useEffect(() => {
    const fetchEmpresa = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuario } = await supabase
        .from("usuario")
        .select("config")
        .eq("auth_id", userData.user.id)
        .single();

      if (!usuario?.config) return;

      const { data: empresa } = await supabase
        .from("empresa")
        .select("id")
        .eq("id_config", usuario.config)
        .single();

      if (empresa) {
        setEmpresaId(empresa.id);
      }
    };

    fetchEmpresa();
  }, []);

  const { data: snapshots, isLoading, refetch } = useQuery({
    queryKey: ["snapshots", empresaId, dataInicio, dataFim],
    queryFn: async () => {
      if (!empresaId) return [];

      let query = supabase
        .from("vx_snapshots")
        .select("*")
        .eq("id_empresa", empresaId)
        .order("mes_referencia", { ascending: false });

      if (dataInicio) {
        query = query.gte("mes_referencia", dataInicio);
      }
      if (dataFim) {
        query = query.lte("mes_referencia", dataFim);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Snapshot[];
    },
    enabled: !!empresaId,
  });

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("vx_snapshots")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error("Erro ao excluir snapshot");
      return;
    }

    toast.success("Snapshot excluído com sucesso");
    setDeleteId(null);
    refetch();
  };

  const clearFilters = () => {
    setDataInicio("");
    setDataFim("");
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    return format(date, "MMMM/yyyy", { locale: ptBR });
  };

  const hasFilters = dataInicio || dataFim;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Snapshots"
        description="Fotografias patrimoniais e financeiras da empresa"
      />

      <div className="space-y-6">
        {/* Actions and Filters */}
        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
              <div className="flex flex-col md:flex-row gap-4 items-end flex-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">Filtros:</span>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="dataInicio" className="text-xs text-muted-foreground">
                      Data Início
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="dataInicio"
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="pl-10 w-[160px]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dataFim" className="text-xs text-muted-foreground">
                      Data Fim
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="dataFim"
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="pl-10 w-[160px]"
                      />
                    </div>
                  </div>
                  {hasFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="self-end"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
              <Button onClick={() => toast.info("Funcionalidade em desenvolvimento")}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Snapshot
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Snapshots List */}
        <Card className="glass border-border/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !snapshots || snapshots.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Calendar}
                  title="Nenhum snapshot encontrado"
                  description={
                    hasFilters
                      ? "Não há snapshots para o período selecionado"
                      : "Crie seu primeiro snapshot para começar a acompanhar a evolução patrimonial"
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês Referência</TableHead>
                    <TableHead className="text-right">Valor em Estoque</TableHead>
                    <TableHead className="text-right">Lucro Estimado</TableHead>
                    <TableHead className="text-right">Saldo em Contas</TableHead>
                    <TableHead className="text-right">A Receber</TableHead>
                    <TableHead className="text-center">Veículos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      <TableCell className="font-medium capitalize">
                        {formatDate(snapshot.mes_referencia)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(snapshot.total_estoque)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-500">
                        {formatCurrency(snapshot.total_estimado)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(snapshot.saldo)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(snapshot.contas_a_receber)}
                      </TableCell>
                      <TableCell className="text-center">
                        {Array.isArray(snapshot.estoque_atual)
                          ? snapshot.estoque_atual.length
                          : 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toast.info("Visualização em desenvolvimento")}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(snapshot.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este snapshot? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Snapshots;
