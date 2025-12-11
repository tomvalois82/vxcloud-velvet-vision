import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { Plus, CreditCard, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CartaoDialog } from "@/features/financeiro/components/CartaoDialog";
import { maskCurrency } from "@/features/estoque/utils/masks";

interface Cartao {
  id: string;
  id_empresa: string;
  id_forma_pagamento: string;
  descricao: string;
  nome_impresso: string;
  final: string;
  bandeira: string;
  limite: number;
  dia_fechamento: number;
  dia_vencimento: number;
  ativo: boolean;
}

const FinanceiroCartoes = () => {
  const { toast } = useToast();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCartao, setSelectedCartao] = useState<Cartao | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cartaoToDelete, setCartaoToDelete] = useState<Cartao | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  const fetchCartoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vx_fin_cartao")
        .select("*")
        .order("descricao", { ascending: true });

      if (error) throw error;
      setCartoes(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar cartões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartoes();
  }, []);

  const handleEdit = (cartao: Cartao) => {
    setSelectedCartao(cartao);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedCartao(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (cartao: Cartao) => {
    setCartaoToDelete(cartao);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cartaoToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("vx_fin_cartao")
        .delete()
        .eq("id", cartaoToDelete.id);

      if (error) {
        if (error.code === "23503") {
          toast({
            title: "Não é possível excluir",
            description: "Este cartão está vinculado a operações financeiras e não pode ser excluído.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Cartão excluído",
          description: "O cartão foi excluído com sucesso.",
        });
        fetchCartoes();
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
      setCartaoToDelete(null);
    }
  };

  const handleToggleStatus = async (cartao: Cartao) => {
    setTogglingStatus(cartao.id);
    try {
      const { error } = await supabase
        .from("vx_fin_cartao")
        .update({ ativo: !cartao.ativo })
        .eq("id", cartao.id);

      if (error) throw error;

      setCartoes((prev) =>
        prev.map((c) =>
          c.id === cartao.id ? { ...c, ativo: !c.ativo } : c
        )
      );

      toast({
        title: cartao.ativo ? "Cartão desativado" : "Cartão ativado",
        description: `O cartão foi ${cartao.ativo ? "desativado" : "ativado"} com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTogglingStatus(null);
    }
  };

  // Calculate days until invoice (from fechamento to vencimento)
  const calcularDiasFatura = (diaFechamento: number, diaVencimento: number) => {
    if (diaVencimento >= diaFechamento) {
      return diaVencimento - diaFechamento;
    } else {
      // Vencimento no próximo mês
      return (30 - diaFechamento) + diaVencimento;
    }
  };

  const filteredCartoes = cartoes.filter(
    (cartao) =>
      cartao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cartao.bandeira.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cartao.final.includes(searchTerm)
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Cartões de Crédito"
        description="Gerencie os cartões de crédito da empresa"
        action={
          <Button className="bg-accent hover:bg-accent/90" onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Cartão
          </Button>
        }
      />

      <div className="glass rounded-lg p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-muted-foreground">Carregando cartões...</span>
          </div>
        ) : cartoes.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Nenhum cartão cadastrado"
            description="Adicione cartões de crédito para controlar suas faturas."
          />
        ) : (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cartão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-border/50"
              />
            </div>

            <div className="rounded-lg border border-border/50 overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-foreground font-semibold">Descrição</TableHead>
                    <TableHead className="text-foreground font-semibold">Bandeira</TableHead>
                    <TableHead className="text-foreground font-semibold">Final</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Limite</TableHead>
                    <TableHead className="text-foreground font-semibold text-center">Dias Fechamento</TableHead>
                    <TableHead className="text-foreground font-semibold text-center">Dia Vencimento</TableHead>
                    <TableHead className="text-foreground font-semibold text-center">Ativo</TableHead>
                    <TableHead className="text-foreground font-semibold w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCartoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum cartão encontrado com "{searchTerm}"
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCartoes.map((cartao) => (
                      <TableRow key={cartao.id} className="border-border/50">
                        <TableCell className="font-medium text-foreground">
                          {cartao.descricao}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-accent/20 text-accent">
                            {cartao.bandeira}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono">
                          •••• {cartao.final}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(Number(cartao.limite))}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          Dia {cartao.dia_fechamento}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          Dia {cartao.dia_vencimento}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={cartao.ativo}
                            onCheckedChange={() => handleToggleStatus(cartao)}
                            disabled={togglingStatus === cartao.id}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-accent/20"
                              onClick={() => handleEdit(cartao)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/20 text-destructive"
                              onClick={() => handleDeleteClick(cartao)}
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

      <CartaoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cartao={selectedCartao}
        onSuccess={fetchCartoes}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-strong border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir o cartão "{cartaoToDelete?.descricao}"?
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

export default FinanceiroCartoes;
