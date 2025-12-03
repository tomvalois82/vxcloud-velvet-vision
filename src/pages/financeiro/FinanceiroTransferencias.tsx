import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeftRight, Search, Loader2, Undo2 } from "lucide-react";
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
  const [estornoDialogOpen, setEstornoDialogOpen] = useState(false);
  const [transferenciaParaEstornar, setTransferenciaParaEstornar] = useState<Transferencia | null>(null);
  const [estornando, setEstornando] = useState(false);

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

  const handleEstornoClick = (transferencia: Transferencia) => {
    setTransferenciaParaEstornar(transferencia);
    setEstornoDialogOpen(true);
  };

  const handleEstornoConfirm = async () => {
    if (!transferenciaParaEstornar) return;

    setEstornando(true);
    try {
      // Buscar saldo atual das contas
      const { data: contaOrigem, error: erroOrigem } = await supabase
        .from("vx_fin_conta")
        .select("id, saldo")
        .eq("id", transferenciaParaEstornar.conta_origem?.banco ? 
          (await supabase.from("vx_fin_movimento").select("id_conta").eq("id", transferenciaParaEstornar.id).single()).data?.id_conta : null)
        .maybeSingle();

      // Buscar IDs das contas diretamente do movimento
      const { data: movimento, error: erroMovimento } = await supabase
        .from("vx_fin_movimento")
        .select("id_conta, id_conta_destino")
        .eq("id", transferenciaParaEstornar.id)
        .single();

      if (erroMovimento || !movimento) {
        throw new Error("Erro ao buscar dados da transferência");
      }

      const valor = transferenciaParaEstornar.valor_bruto;

      // Creditar de volta na conta origem
      const { data: contaOrigemData } = await supabase
        .from("vx_fin_conta")
        .select("saldo")
        .eq("id", movimento.id_conta)
        .single();

      if (contaOrigemData) {
        await supabase
          .from("vx_fin_conta")
          .update({ saldo: Number(contaOrigemData.saldo) + valor })
          .eq("id", movimento.id_conta);
      }

      // Debitar da conta destino
      if (movimento.id_conta_destino) {
        const { data: contaDestinoData } = await supabase
          .from("vx_fin_conta")
          .select("saldo")
          .eq("id", movimento.id_conta_destino)
          .single();

        if (contaDestinoData) {
          await supabase
            .from("vx_fin_conta")
            .update({ saldo: Number(contaDestinoData.saldo) - valor })
            .eq("id", movimento.id_conta_destino);
        }
      }

      // Deletar o registro da transferência
      const { error: deleteError } = await supabase
        .from("vx_fin_movimento")
        .delete()
        .eq("id", transferenciaParaEstornar.id);

      if (deleteError) throw deleteError;

      toast.success("Transferência estornada com sucesso");
      setEstornoDialogOpen(false);
      setTransferenciaParaEstornar(null);
      fetchTransferencias();
    } catch (error: any) {
      toast.error("Erro ao estornar transferência: " + error.message);
    } finally {
      setEstornando(false);
    }
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
                  <TableHead className="text-right">Ações</TableHead>
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
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEstornoClick(transferencia)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Undo2 className="w-4 h-4 mr-1" />
                        Estornar
                      </Button>
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

      <AlertDialog open={estornoDialogOpen} onOpenChange={setEstornoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar Transferência</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja estornar esta transferência?
              {transferenciaParaEstornar && (
                <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                  <p><strong>Valor:</strong> {maskCurrency(transferenciaParaEstornar.valor_bruto)}</p>
                  <p><strong>De:</strong> {getContaDisplayName(transferenciaParaEstornar.conta_origem)}</p>
                  <p><strong>Para:</strong> {getContaDisplayName(transferenciaParaEstornar.conta_destino)}</p>
                </div>
              )}
              <p className="mt-2 text-destructive">
                O valor será devolvido à conta de origem e debitado da conta de destino.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={estornando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEstornoConfirm}
              disabled={estornando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {estornando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Estorno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FinanceiroTransferencias;
