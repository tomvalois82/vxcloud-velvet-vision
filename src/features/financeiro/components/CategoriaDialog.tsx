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

const formSchema = z.object({
  categoria: z.string().min(1, "Nome da categoria é obrigatório"),
  operacao: z.string().min(1, "Tipo de operação é obrigatório"),
  id_categoria_pai: z.string().nullable(),
  classificacao: z.string().nullable(),
});

type FormData = z.infer<typeof formSchema>;

const CLASSIFICACAO_OPTIONS = [
  { value: "DESPESA FIXA", label: "Despesa Fixa" },
  { value: "CUSTO DIRETO", label: "Custo Direto" },
  { value: "RECEITA DE VENDA", label: "Receita de Venda" },
  { value: "NÃO OPERACIONAL", label: "Não Operacional" },
];

interface Categoria {
  id: string;
  categoria: string;
  id_categoria_pai: string | null;
  ativo: boolean;
  operacao: string;
  classificacao: string | null;
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoria: "",
      operacao: "Pagar",
      id_categoria_pai: null,
      classificacao: null,
    },
  });

  useEffect(() => {
    if (open) {
      fetchAllCategorias();
      
      if (categoria) {
        // Editing existing
        form.reset({
          categoria: categoria.categoria,
          operacao: categoria.operacao,
          id_categoria_pai: categoria.id_categoria_pai,
          classificacao: categoria.classificacao,
        });
      } else if (parentCategoria) {
        // Creating subcategory
        form.reset({
          categoria: "",
          operacao: parentCategoria.operacao, // Inherit parent's operation type
          id_categoria_pai: parentCategoria.id,
          classificacao: null,
        });
      } else {
        // Creating new root category
        form.reset({
          categoria: "",
          operacao: "Pagar",
          id_categoria_pai: null,
          classificacao: null,
        });
      }
    }
  }, [open, categoria, parentCategoria, form]);

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

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    try {
      // Check for duplicate name at same level
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
        // Update
        const { error } = await supabase
          .from("vx_fin_categoria")
          .update({
            categoria: data.categoria,
            operacao: data.operacao,
            id_categoria_pai: data.id_categoria_pai,
            classificacao: data.classificacao,
          })
          .eq("id", categoria.id);

        if (error) throw error;
        toast.success("Categoria atualizada com sucesso!");
      } else {
        // Create
        const { error } = await supabase
          .from("vx_fin_categoria")
          .insert({
            categoria: data.categoria,
            operacao: data.operacao,
            id_categoria_pai: data.id_categoria_pai,
            classificacao: data.classificacao,
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

  // Filter out the current category and its descendants to prevent circular references
  const getAvailableParents = (): Categoria[] => {
    if (!categoria) return allCategorias;
    
    const getDescendantIds = (parentId: string): string[] => {
      const children = allCategorias.filter((c) => c.id_categoria_pai === parentId);
      return children.flatMap((c) => [c.id, ...getDescendantIds(c.id)]);
    };
    
    const excludeIds = new Set([categoria.id, ...getDescendantIds(categoria.id)]);
    return allCategorias.filter((c) => !excludeIds.has(c.id));
  };

  const availableParents = getAvailableParents();

  // Build path for display
  const getCategoriaPath = (cat: Categoria): string => {
    const path: string[] = [cat.categoria];
    let current = cat;
    
    while (current.id_categoria_pai) {
      const parent = allCategorias.find((c) => c.id === current.id_categoria_pai);
      if (parent) {
        path.unshift(parent.categoria);
        current = parent;
      } else {
        break;
      }
    }
    
    return path.join(" → ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {categoria
              ? "Editar Categoria"
              : parentCategoria
              ? `Nova Subcategoria em "${parentCategoria.categoria}"`
              : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    disabled={!!parentCategoria} // Inherit from parent when creating subcategory
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
  );
}
