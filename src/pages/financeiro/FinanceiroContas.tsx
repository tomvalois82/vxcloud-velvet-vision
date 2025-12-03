import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Wallet, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ContaDialog } from "@/features/financeiro/components/ContaDialog";
import { maskCurrency } from "@/features/estoque/utils/masks";

interface Conta {
  id: string;
  banco: string;
  descricao: string | null;
  saldo: number;
}

const FinanceiroContas = () => {
  const { toast } = useToast();
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<Conta | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<Conta | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vx_fin_conta")
        .select("*")
        .order("banco", { ascending: true });

      if (error) throw error;
      setContas(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar contas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContas();
  }, []);

  const handleEdit = (conta: Conta) => {
    setSelectedConta(conta);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedConta(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (conta: Conta) => {
    setContaToDelete(conta);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contaToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("vx_fin_conta")
        .delete()
        .eq("id", contaToDelete.id);

      if (error) {
        if (error.code === "23503") {
          toast({
            title: "Não é possível excluir",
            description: "Essa conta está vinculada a operações financeiras e não pode ser excluída.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Conta excluída",
          description: "A conta foi excluída com sucesso.",
        });
        fetchContas();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setContaToDelete(null);
    }
  };

  const filteredContas = contas.filter((conta) =>
    conta.banco.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (conta.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contas"
        description="Gerencie contas bancárias e caixas"
        action={
          <Button className="bg-accent hover:bg-accent/90" onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        }
      />

      <div className="glass rounded-lg p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-muted-foreground">Carregando contas...</span>
          </div>
        ) : contas.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nenhuma conta cadastrada"
            description="Adicione contas bancárias ou caixas para começar o controle financeiro."
          />
        ) : (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-border/50"
              />
            </div>

            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-foreground font-semibold">Nome</TableHead>
                    <TableHead className="text-foreground font-semibold">Descrição</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Saldo</TableHead>
                    <TableHead className="text-foreground font-semibold w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma conta encontrada com "{searchTerm}"
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContas.map((conta) => (
                      <TableRow key={conta.id} className="border-border/50">
                        <TableCell className="font-medium text-foreground">
                          {conta.banco}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {conta.descricao || "-"}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${Number(conta.saldo) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {maskCurrency(Number(conta.saldo))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-accent/20"
                              onClick={() => handleEdit(conta)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/20 text-destructive"
                              onClick={() => handleDeleteClick(conta)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <ContaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        conta={selectedConta}
        onSuccess={fetchContas}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-strong border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir a conta "{contaToDelete?.banco}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FinanceiroContas;
