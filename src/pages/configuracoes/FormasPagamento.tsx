import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Loader2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FormaPagamentoDialog } from "@/features/configuracoes/components/FormaPagamentoDialog";

interface FormaPagamento {
  id: string;
  descricao: string;
  ativa: boolean;
  id_conta_padrao: string | null;
}

const FormasPagamento = () => {
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [filteredFormas, setFilteredFormas] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedForma, setSelectedForma] = useState<FormaPagamento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formaToDelete, setFormaToDelete] = useState<FormaPagamento | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFormasPagamento = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vx_forma_pagamento")
        .select("*")
        .order("descricao");

      if (error) throw error;
      setFormasPagamento(data || []);
      setFilteredFormas(data || []);
    } catch (err) {
      console.error("Erro ao carregar formas de pagamento:", err);
      toast.error("Erro ao carregar formas de pagamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormasPagamento();
  }, []);

  useEffect(() => {
    const searchLower = search.toLowerCase();
    const filtered = formasPagamento.filter((forma) =>
      forma.descricao.toLowerCase().includes(searchLower)
    );
    setFilteredFormas(filtered);
  }, [search, formasPagamento]);

  const handleNew = () => {
    setSelectedForma(null);
    setDialogOpen(true);
  };

  const handleEdit = (forma: FormaPagamento) => {
    setSelectedForma(forma);
    setDialogOpen(true);
  };

  const handleDeleteClick = (forma: FormaPagamento) => {
    setFormaToDelete(forma);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!formaToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("vx_forma_pagamento")
        .delete()
        .eq("id", formaToDelete.id);

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === "23503") {
          toast.error(
            "Esta forma de pagamento está vinculada a outras operações e não pode ser excluída."
          );
        } else {
          throw error;
        }
      } else {
        toast.success("Forma de pagamento excluída com sucesso");
        fetchFormasPagamento();
      }
    } catch (err) {
      console.error("Erro ao excluir forma de pagamento:", err);
      toast.error("Erro ao excluir forma de pagamento");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setFormaToDelete(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Formas de Pagamento"
        description="Gerencie as formas de pagamento do sistema"
      />

      <div className="glass rounded-xl p-6 border border-border/50">
        {/* Header with search and add button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/50 border-border/50 text-foreground"
            />
          </div>
          <Button
            onClick={handleNew}
            className="bg-accent hover:bg-accent/80 text-accent-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Forma de Pagamento
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-muted-foreground">Carregando...</span>
          </div>
        ) : filteredFormas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {search
                ? "Nenhuma forma de pagamento encontrada"
                : "Nenhuma forma de pagamento cadastrada"}
            </p>
            {!search && (
              <Button
                onClick={handleNew}
                variant="link"
                className="mt-2 text-accent"
              >
                Adicionar primeira forma de pagamento
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFormas.map((forma) => (
                  <TableRow
                    key={forma.id}
                    className="border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium text-foreground">
                      {forma.descricao}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={forma.ativa ? "default" : "secondary"}
                        className={
                          forma.ativa
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {forma.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(forma)}
                          className="h-8 w-8 p-0 hover:bg-accent/20 hover:text-accent"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(forma)}
                          className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <FormaPagamentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        formaPagamento={selectedForma}
        onSuccess={fetchFormasPagamento}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-strong border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Deseja realmente excluir a forma de pagamento{" "}
              <strong className="text-foreground">
                "{formaToDelete?.descricao}"
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="border-border/50 hover:bg-muted/50"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
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

export default FormasPagamento;
