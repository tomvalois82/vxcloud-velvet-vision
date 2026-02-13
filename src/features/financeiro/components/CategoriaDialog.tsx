import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CategoriaAutocomplete } from "./CategoriaAutocomplete";
import { PlanoContasAutocomplete } from "@/features/contabilidade/components/PlanoContasAutocomplete";

const formSchema = z.object({
  categoria: z.string().min(1, "Nome da categoria é obrigatório"),
  operacao: z.string().min(1, "Tipo de operação é obrigatório"),
  id_categoria_pai: z.string().nullable(),
  classificacao: z.string().nullable(),
  tipo_conta: z.string().min(1, "Tipo da conta é obrigatório"),
  codigo_estruturado: z.string().nullable(),
  id_plano_contas: z.string().nullable(),
});

type FormData = z.infer<typeof formSchema>;

const CLASSIFICACAO_OPTIONS = [
  { value: "RECEITA_VENDA", label: "Receita de Venda" },
  { value: "CUSTO_VEICULO", label: "Custo Veículo" },
  { value: "CUSTO_PREPARO", label: "Custo Preparo" },
  { value: "CUSTO_VENDA", label: "Custo Venda" },
  { value: "DESPESA_OPERACIONAL", label: "Despesa Operacional" },
  { value: "RESULTADO_FINANCEIRO", label: "Resultado Financeiro" },
  { value: "NAO_OPERACIONAL", label: "Não Operacional" },
];

interface Categoria {
  id: string;
  categoria: string;
  id_categoria_pai: string | null;
  ativo: boolean;
  operacao: string;
  classificacao: string | null;
  codigo_estruturado?: string | null;
  id_plano_contas?: string | null;
}

interface PlanoContas {
  id: string;
  nome_conta: string;
  codigo_estruturado: string;
  tipo_conta: string | null;
  id_pai: string | null;
}

interface CategoriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria: Categoria | null;
  parentCategoria: Categoria | null;
  onSave: () => void;
}

export function CategoriaDialog({
  open,
  onOpenChange,
  categoria,
  parentCategoria,
  onSave,
}: CategoriaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [allCategorias, setAllCategorias] = useState<Categoria[]>([]);
  const [planoContas, setPlanoContas] = useState<PlanoContas[]>([]);
  const [showChildAlert, setShowChildAlert] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoria: "",
      operacao: "Pagar",
      id_categoria_pai: null,
      classificacao: null,
      tipo_conta: "Analítica",
      codigo_estruturado: null,
      id_plano_contas: null,
    },
  });

  const calcularCodigoEstruturado = (parentId: string | null, cats: Categoria[]): string => {
    if (parentId) {
      const parent = cats.find(c => c.id === parentId);
      const parentCodigo = parent?.codigo_estruturado || "";
      const siblings = cats.filter(c => c.id_categoria_pai === parentId);
      let maxNum = 0;
      siblings.forEach(s => {
        if (s.codigo_estruturado) {
          const parts = s.codigo_estruturado.split(".");
          const lastNum = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(lastNum) && lastNum > maxNum) maxNum = lastNum;
        }
      });
      return `${parentCodigo}.${maxNum + 1}`;
    } else {
      const roots = cats.filter(c => !c.id_categoria_pai);
      let maxNum = 0;
      roots.forEach(r => {
        if (r.codigo_estruturado) {
          const num = parseInt(r.codigo_estruturado, 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      return String(maxNum + 1);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAllCategorias();
      fetchPlanoContas();
      
      if (categoria) {
        form.reset({
          categoria: categoria.categoria,
          operacao: categoria.operacao,
          id_categoria_pai: categoria.id_categoria_pai,
          classificacao: categoria.classificacao,
          tipo_conta: (categoria as any).tipo_conta || "Analítica",
          codigo_estruturado: categoria.codigo_estruturado || null,
          id_plano_contas: categoria.id_plano_contas || null,
        });
      } else if (parentCategoria) {
        form.reset({
          categoria: "",
          operacao: parentCategoria.operacao,
          id_categoria_pai: parentCategoria.id,
          classificacao: null,
          tipo_conta: "Analítica",
          codigo_estruturado: null,
          id_plano_contas: null,
        });
      } else {
        form.reset({
          categoria: "",
          operacao: "Pagar",
          id_categoria_pai: null,
          classificacao: null,
          tipo_conta: "Analítica",
          codigo_estruturado: null,
          id_plano_contas: null,
        });
      }
    }
  }, [open, categoria, parentCategoria, form]);

  const idCategoriaPai = form.watch("id_categoria_pai");
  
  useEffect(() => {
    if (!open || !allCategorias.length) return;
    if (categoria) return;
    
    const codigo = calcularCodigoEstruturado(idCategoriaPai, allCategorias);
    form.setValue("codigo_estruturado", codigo);
  }, [idCategoriaPai, allCategorias, open, categoria]);

  const fetchAllCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from("vx_fin_categoria")
        .select("*")
        .order("categoria");

      if (error) throw error;
      setAllCategorias(data || []);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
    }
  };

  const fetchPlanoContas = async () => {
    try {
      const { data, error } = await supabase
        .from("vx_fin_plano_contas")
        .select("id, nome_conta, codigo_estruturado, tipo_conta, id_pai")
        .order("codigo_estruturado");

      if (error) throw error;
      setPlanoContas(data || []);
    } catch (error) {
      console.error("Erro ao buscar plano de contas:", error);
    }
  };

  const getDescendantIds = (parentId: string): string[] => {
    const children = allCategorias.filter((c) => c.id_categoria_pai === parentId);
    return children.flatMap((c) => [c.id, ...getDescendantIds(c.id)]);
  };

  const hasChildren = (catId: string): boolean => {
    return allCategorias.some(c => c.id_categoria_pai === catId);
  };

  const saveCategory = async (data: FormData, propagateToChildren: boolean) => {
    setLoading(true);
    
    try {
      let query = supabase
        .from("vx_fin_categoria")
        .select("id")
        .ilike("categoria", data.categoria);

      if (data.id_categoria_pai) {
        query = query.eq("id_categoria_pai", data.id_categoria_pai);
      } else {
        query = query.is("id_categoria_pai", null);
      }

      if (categoria) {
        query = query.neq("id", categoria.id);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        toast.error("Já existe uma categoria com este nome neste nível.");
        setLoading(false);
        return;
      }

      if (categoria) {
        const { error } = await supabase
          .from("vx_fin_categoria")
          .update({
            categoria: data.categoria,
            operacao: data.operacao,
            id_categoria_pai: data.id_categoria_pai,
            classificacao: data.classificacao,
            tipo_conta: data.tipo_conta,
            codigo_estruturado: data.codigo_estruturado,
            id_plano_contas: data.id_plano_contas,
          })
          .eq("id", categoria.id);

        if (error) throw error;

        if (propagateToChildren && data.id_plano_contas !== undefined) {
          const childIds = getDescendantIds(categoria.id);
          if (childIds.length > 0) {
            const { error: childError } = await supabase
              .from("vx_fin_categoria")
              .update({ id_plano_contas: data.id_plano_contas })
              .in("id", childIds);

            if (childError) throw childError;
          }
        }

        toast.success("Categoria atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("vx_fin_categoria")
          .insert({
            categoria: data.categoria,
            operacao: data.operacao,
            id_categoria_pai: data.id_categoria_pai,
            classificacao: data.classificacao,
            tipo_conta: data.tipo_conta,
            codigo_estruturado: data.codigo_estruturado,
            id_plano_contas: data.id_plano_contas,
            ativo: true,
          });

        if (error) throw error;
        toast.success("Categoria criada com sucesso!");
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      toast.error("Erro ao salvar categoria");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (categoria && hasChildren(categoria.id)) {
      const planoChanged = data.id_plano_contas !== (categoria.id_plano_contas || null);
      if (planoChanged) {
        setPendingData(data);
        setShowChildAlert(true);
        return;
      }
    }
    await saveCategory(data, false);
  };

  const getAvailableParents = (): Categoria[] => {
    if (!categoria) return allCategorias;
    
    const excludeIds = new Set([categoria.id, ...getDescendantIds(categoria.id)]);
    return allCategorias.filter((c) => !excludeIds.has(c.id));
  };

  const operacaoAtual = form.watch("operacao");
  const codigoEstruturado = form.watch("codigo_estruturado");
  const availableParents = getAvailableParents().filter(c => c.operacao === operacaoAtual);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {categoria
                ? `Editar Categoria - ${codigoEstruturado || ""}`
                : `Nova Categoria${codigoEstruturado ? ` - ${codigoEstruturado}` : ""}`}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="codigo_estruturado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Estruturado</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        disabled 
                        className="bg-muted"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Categoria *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Despesas Operacionais" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="operacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Operação *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!parentCategoria}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pagar">Pagar (Despesa)</SelectItem>
                        <SelectItem value="Receber">Receber (Receita)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!parentCategoria && (
                <FormField
                  control={form.control}
                  name="id_categoria_pai"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria Pai (opcional)</FormLabel>
                      <FormControl>
                        <CategoriaAutocomplete
                          categorias={availableParents}
                          value={field.value || "__none__"}
                          onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                          placeholder="Selecione a categoria pai"
                          includeAllOption
                          allOptionLabel="Nenhuma (Categoria Raiz)"
                          allowSelectAll
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="tipo_conta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo da Categoria *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Analítica">Analítica</SelectItem>
                        <SelectItem value="Sintética">Sintética</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="classificacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classificação (opcional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a classificação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {CLASSIFICACAO_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_plano_contas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plano de Contas (opcional)</FormLabel>
                    <FormControl>
                      <PlanoContasAutocomplete
                        contas={planoContas}
                        value={field.value || "__none__"}
                        onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                        placeholder="Selecione o plano de contas"
                        includeNoneOption
                        noneOptionLabel="Nenhum"
                        allowSelectAll={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {categoria ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showChildAlert} onOpenChange={setShowChildAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Propagar alteração para subcategorias?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta categoria possui subcategorias. Deseja aplicar a alteração do Plano de Contas também em todas as subcategorias?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={async () => {
                setShowChildAlert(false);
                if (pendingData) {
                  await saveCategory(pendingData, false);
                  setPendingData(null);
                }
              }}
            >
              Apenas esta
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowChildAlert(false);
                if (pendingData) {
                  await saveCategory(pendingData, true);
                  setPendingData(null);
                }
              }}
            >
              Sim, todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}