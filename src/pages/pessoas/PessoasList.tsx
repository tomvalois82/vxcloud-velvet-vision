import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, Search, Pencil, Trash2, Loader2, Star } from "lucide-react";
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
import { PessoaDialog } from "@/features/pessoas/components/PessoaDialog";
import { maskCPF, maskCNPJ } from "@/features/pessoas/utils/masks";

const PessoasList = () => {
  const [pessoas, setPessoas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPessoa, setSelectedPessoa] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pessoaToDelete, setPessoaToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingPadrao, setTogglingPadrao] = useState<string | null>(null);

  const fetchPessoas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vx_pessoa")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setPessoas(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar pessoas:", error);
      toast.error("Erro ao carregar pessoas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPessoas();
  }, []);

  const handleEdit = (pessoa: any) => {
    setSelectedPessoa(pessoa);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!pessoaToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("vx_pessoa")
        .delete()
        .eq("id", pessoaToDelete.id);

      if (error) {
        if (error.code === "23503") {
          toast.error("Não é possível excluir esta pessoa pois ela está vinculada a outros registros");
        } else {
          throw error;
        }
      } else {
        toast.success("Pessoa excluída com sucesso!");
        fetchPessoas();
      }
    } catch (error: any) {
      console.error("Erro ao excluir pessoa:", error);
      toast.error("Erro ao excluir pessoa");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setPessoaToDelete(null);
    }
  };

  const handleTogglePadrao = async (pessoa: any) => {
    if (pessoa.padrao) return; // Já é padrão, não faz nada
    
    setTogglingPadrao(pessoa.id);
    try {
      // Remove padrão de todas as pessoas
      await supabase
        .from("vx_pessoa")
        .update({ padrao: false })
        .neq("id", pessoa.id);

      // Define a pessoa clicada como padrão
      const { error } = await supabase
        .from("vx_pessoa")
        .update({ padrao: true })
        .eq("id", pessoa.id);

      if (error) throw error;

      setPessoas((prev) =>
        prev.map((p) => ({
          ...p,
          padrao: p.id === pessoa.id,
        }))
      );

      toast.success(`${pessoa.nome} agora é a pessoa padrão.`);
    } catch (error: any) {
      console.error("Erro ao definir padrão:", error);
      toast.error("Erro ao definir padrão");
    } finally {
      setTogglingPadrao(null);
    }
  };

  const filteredPessoas = pessoas.filter((pessoa) => {
    const termo = searchTerm.trim();
    if (!termo) return true;
    const termoLower = termo.toLowerCase();
    const termoDigitos = termo.replace(/\D/g, "");

    const nomeMatch = pessoa.nome?.toLowerCase().includes(termoLower) ?? false;
    const cpfMatch =
      termoDigitos.length > 0 &&
      (pessoa.cpf_cnpj?.replace(/\D/g, "").includes(termoDigitos) ?? false);
    const telMatch =
      termoDigitos.length > 0 &&
      (pessoa.telefone?.replace(/\D/g, "").includes(termoDigitos) ?? false);

    return nomeMatch || cpfMatch || telMatch;
  });

  const formatCpfCnpj = (cpfCnpj: string) => {
    if (!cpfCnpj) return "-";
    return cpfCnpj.length === 11 ? maskCPF(cpfCnpj) : maskCNPJ(cpfCnpj);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pessoas"
        description="Gerencie clientes, fornecedores e contatos"
        action={
          <Button
            className="bg-accent hover:bg-accent/90"
            onClick={() => {
              setSelectedPessoa(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Pessoa
          </Button>
        }
      />

      <div className="glass rounded-lg p-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome, CPF ou CNPJ..."
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
        ) : filteredPessoas.length === 0 ? (
          <EmptyState
            icon={Users}
            title={searchTerm ? "Nenhuma pessoa encontrada" : "Nenhuma pessoa cadastrada"}
            description={
              searchTerm
                ? "Tente buscar com outros termos"
                : "Adicione clientes, fornecedores ou outros contatos ao sistema."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade/Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPessoas.map((pessoa) => (
                  <TableRow key={pessoa.id}>
                    <TableCell className="font-medium">{pessoa.nome}</TableCell>
                    <TableCell>{pessoa.tipo_cadastro}</TableCell>
                    <TableCell>{formatCpfCnpj(pessoa.cpf_cnpj)}</TableCell>
                    <TableCell>{pessoa.telefone || "-"}</TableCell>
                    <TableCell>
                      {pessoa.municipio && pessoa.estado
                        ? `${pessoa.municipio}/${pessoa.estado}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(pessoa)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPessoaToDelete(pessoa);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-yellow-500/20"
                          onClick={() => handleTogglePadrao(pessoa)}
                          disabled={togglingPadrao === pessoa.id}
                          title={pessoa.padrao ? "Pessoa padrão" : "Definir como padrão"}
                        >
                          <Star 
                            className={`h-4 w-4 ${pessoa.padrao ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} 
                          />
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
      <PessoaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pessoa={selectedPessoa}
        onSuccess={fetchPessoas}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{pessoaToDelete?.nome}</strong>?
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

export default PessoasList;
