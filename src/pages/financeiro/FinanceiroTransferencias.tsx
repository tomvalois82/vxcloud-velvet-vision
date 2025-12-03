import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeftRight, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransferenciaDialog } from "@/features/financeiro/components/TransferenciaDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transferencia {
  id: string;
  descricao: string;
  valor_bruto: number;
  data_pagamento: string;
  observacoes: string | null;
  conta_origem: {
    banco: string;
    descricao: string | null;
  };
  conta_destino: {
    banco: string;
    descricao: string | null;
  } | null;
}

const maskCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const FinanceiroTransferencias = () => {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchTransferencias();
  }, []);

  const fetchTransferencias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vx_fin_movimento")
        .select(`
          id,
          descricao,
          valor_bruto,
          data_pagamento,
          observacoes,
          conta_origem:vx_fin_conta!vx_fin_movimento_id_conta_fkey(banco, descricao),
          conta_destino:vx_fin_conta!vx_fin_movimento_id_conta_destino_fkey(banco, descricao)
        `)
        .eq("tipo_movimento", "Transferência")
        .order("data_pagamento", { ascending: false });

      if (error) throw error;
      setTransferencias(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar transferências: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getContaDisplayName = (conta: { banco: string; descricao: string | null } | null) => {
    if (!conta) return "-";
    return conta.descricao ? `${conta.banco} - ${conta.descricao}` : conta.banco;
  };

  const filteredTransferencias = transferencias.filter((t) =>
    t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getContaDisplayName(t.conta_origem).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getContaDisplayName(t.conta_destino).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Transferências"
        description="Gerencie transferências entre contas"
        action={
          <Button className="bg-accent hover:bg-accent/90" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Transferência
          </Button>
        }
      />

      <div className="glass rounded-lg p-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transferências..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTransferencias.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Nenhuma transferência encontrada"
            description={searchTerm ? "Nenhuma transferência corresponde à busca." : "Não há transferências entre contas no momento."}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransferencias.map((transferencia) => (
                  <TableRow key={transferencia.id}>
                    <TableCell>
                      {transferencia.data_pagamento
                        ? format(new Date(transferencia.data_pagamento + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>{getContaDisplayName(transferencia.conta_origem)}</TableCell>
                    <TableCell>{getContaDisplayName(transferencia.conta_destino)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {maskCurrency(transferencia.valor_bruto)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {transferencia.observacoes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <TransferenciaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchTransferencias}
      />
    </div>
  );
};

export default FinanceiroTransferencias;
