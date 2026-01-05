import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Building, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { FinanceiraDialog } from "@/features/financeiras/components/FinanceiraDialog";

interface Financeira {
  id: string;
  nome: string;
  ativa: boolean;
  logo_url: string | null;
}

const FinanceirasList = () => {
  const [financeiras, setFinanceiras] = useState<Financeira[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFinanceira, setSelectedFinanceira] = useState<Financeira | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [financeiraToDelete, setFinanceiraToDelete] = useState<Financeira | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFinanceiras = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vx_financeiras")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setFinanceiras(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar financeiras:", error);
      toast.error("Erro ao carregar financeiras");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceiras();
  }, []);

  const handleEdit = (financeira: Financeira) => {
    setSelectedFinanceira(financeira);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!financeiraToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("vx_financeiras")
        .delete()
        .eq("id", financeiraToDelete.id);

      if (error) {
        if (error.code === "23503") {
          toast.error("Não é possível excluir esta financeira pois ela está vinculada a outros registros");
        } else {
          throw error;
        }
      } else {
        toast.success("Financeira excluída com sucesso!");
        fetchFinanceiras();
      }
    } catch (error: any) {
      console.error("Erro ao excluir financeira:", error);
      toast.error("Erro ao excluir financeira");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setFinanceiraToDelete(null);
    }
  };

  const filteredFinanceiras = financeiras.filter((financeira) => {
    const search = searchTerm.toLowerCase();
    return financeira.nome?.toLowerCase().includes(search);
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Financeiras"
        description="Gerencie as financeiras do sistema"
        action={
          <Button
            className="bg-accent hover:bg-accent/90"
            onClick={() => {
              setSelectedFinanceira(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Financeira
          </Button>
        }
      />

      <div className="glass rounded-lg p-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table or Empty State */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : filteredFinanceiras.length === 0 ? (
          <EmptyState
            icon={Building}
            title={searchTerm ? "Nenhuma financeira encontrada" : "Nenhuma financeira cadastrada"}
            description={
              searchTerm
                ? "Tente buscar com outros termos"
                : "Adicione financeiras ao sistema para usar nos financiamentos."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFinanceiras.map((financeira) => (
                  <TableRow key={financeira.id}>
                    <TableCell>
                      {financeira.logo_url ? (
                        <img
                          src={financeira.logo_url}
                          alt={financeira.nome}
                          className="h-10 w-20 object-contain rounded"
                        />
                      ) : (
                        <div className="h-10 w-20 bg-muted rounded flex items-center justify-center">
                          <Building className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{financeira.nome}</TableCell>
                    <TableCell>
                      <Badge variant={financeira.ativa ? "default" : "secondary"}>
                        {financeira.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(financeira)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFinanceiraToDelete(financeira);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Dialog */}
      <FinanceiraDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        financeira={selectedFinanceira}
        onSuccess={fetchFinanceiras}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{financeiraToDelete?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FinanceirasList;
