import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Search, FileText, Wallet } from "lucide-react";
import { CarteiraDetailDialog } from "@/features/investidor/components/CarteiraDetailDialog";

interface InvestidorCarteira {
  id_pessoa: string;
  nome: string;
  alocado: number;
  carteira: number;
  total: number;
  solicitado: number;
}

export default function InvestidoresCarteiras() {
  const [investidores, setInvestidores] = useState<InvestidorCarteira[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvestidor, setSelectedInvestidor] = useState<InvestidorCarteira | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const fetchInvestidores = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vw_investidor_carteira")
        .select("*")
        .order("nome");

      if (error) throw error;

      setInvestidores(
        (data || []).map((item) => ({
          id_pessoa: item.id_pessoa || "",
          nome: item.nome || "",
          alocado: Number(item.alocado) || 0,
          carteira: Number(item.carteira) || 0,
          total: Number(item.total) || 0,
          solicitado: Number(item.solicitado) || 0,
        }))
      );
    } catch (error) {
      console.error("Erro ao buscar investidores:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestidores();

    // Realtime subscription para atualizações automáticas
    const channel = supabase
      .channel('carteiras-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vx_investimento' }, fetchInvestidores)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vx_investimento_carteira' }, fetchInvestidores)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vx_pessoa' }, fetchInvestidores)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInvestidores]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleViewDetails = (investidor: InvestidorCarteira) => {
    setSelectedInvestidor(investidor);
    setDetailDialogOpen(true);
  };

  const filteredInvestidores = investidores.filter((inv) =>
    inv.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carteiras de Investidores"
        description="Controle de aportes e saldos dos investidores"
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar investidor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Alocado</TableHead>
              <TableHead className="text-right">Saldo em Carteira</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[100px] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredInvestidores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    icon={Wallet}
                    title="Nenhum investidor encontrado"
                    description="Não há investidores com carteira cadastrada."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredInvestidores.map((inv) => (
                <TableRow key={inv.id_pessoa}>
                  <TableCell className="font-medium">{inv.nome}</TableCell>
                  <TableCell className="text-right">
                    <span className={inv.alocado > 0 ? "text-amber-600" : ""}>
                      {formatCurrency(inv.alocado)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={inv.carteira >= 0 ? "text-green-600" : "text-destructive"}>
                      {formatCurrency(inv.carteira)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(inv.total)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(inv)}
                      title="Ver detalhes"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CarteiraDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        investidor={selectedInvestidor}
        onDeleted={fetchInvestidores}
      />
    </div>
  );
}
