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
import { PlanoContasAutocomplete } from "./PlanoContasAutocomplete";

const formSchema = z.object({
  nome_conta: z.string().min(1, "Nome da conta é obrigatório"),
  tipo_conta: z.string().min(1, "Tipo da conta é obrigatório"),
  natureza: z.string().nullable(),
  id_pai: z.string().nullable(),
  codigo_estruturado: z.string().min(1, "Código estruturado é obrigatório"),
});

type FormData = z.infer<typeof formSchema>;

interface PlanoContas {
  id: string;
  nome_conta: string;
  codigo_estruturado: string;
  tipo_conta: string | null;
  natureza: string | null;
  id_pai: string | null;
  id_empresa: string | null;
  children?: PlanoContas[];
  hasChildren?: boolean;
}

interface PlanoContasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: PlanoContas | null;
  parentConta: PlanoContas | null;
  onSave: () => void;
}

export function PlanoContasDialog({
  open,
  onOpenChange,
  conta,
  parentConta,
  onSave,
}: PlanoContasDialogProps) {
  const [loading, setLoading] = useState(false);
  const [allContas, setAllContas] = useState<PlanoContas[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_conta: "",
      tipo_conta: "Analítica",
      natureza: null,
      id_pai: null,
      codigo_estruturado: "",
    },
  });

  const calcularCodigoEstruturado = (parentId: string | null, contas: PlanoContas[]): string => {
    if (parentId) {
      const parent = contas.find(c => c.id === parentId);
      const parentCodigo = parent?.codigo_estruturado || "";
      const siblings = contas.filter(c => c.id_pai === parentId);
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
      const roots = contas.filter(c => !c.id_pai);
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
      fetchAllContas();

      if (conta) {
        form.reset({
          nome_conta: conta.nome_conta,
          tipo_conta: conta.tipo_conta || "Analítica",
          natureza: conta.natureza,
          id_pai: conta.id_pai,
          codigo_estruturado: conta.codigo_estruturado,
        });
      } else if (parentConta) {
        form.reset({
          nome_conta: "",
          tipo_conta: "Analítica",
          natureza: parentConta.natureza,
          id_pai: parentConta.id,
          codigo_estruturado: "",
        });
      } else {
        form.reset({
          nome_conta: "",
          tipo_conta: "Analítica",
          natureza: null,
          id_pai: null,
          codigo_estruturado: "",
        });
      }
    }
  }, [open, conta, parentConta, form]);

  const idPai = form.watch("id_pai");

  useEffect(() => {
    if (!open || !allContas.length) return;
    if (conta) return;

    const codigo = calcularCodigoEstruturado(idPai, allContas);
    form.setValue("codigo_estruturado", codigo);
  }, [idPai, allContas, open, conta]);

  const fetchAllContas = async () => {
    try {
      const { data, error } = await supabase
        .from("vx_fin_plano_contas")
        .select("*")
        .order("nome_conta");

      if (error) throw error;
      setAllContas((data || []) as PlanoContas[]);
    } catch (error) {
      console.error("Erro ao buscar contas:", error);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      // Check duplicate
      let query = supabase
        .from("vx_fin_plano_contas")
        .select("id")
        .ilike("nome_conta", data.nome_conta);

      if (data.id_pai) {
        query = query.eq("id_pai", data.id_pai);
      } else {
        query = query.is("id_pai", null);
      }

      if (conta) {
        query = query.neq("id", conta.id);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        toast.error("Já existe uma conta com este nome neste nível.");
        setLoading(false);
        return;
      }

      if (conta) {
        const { error } = await supabase
          .from("vx_fin_plano_contas")
          .update({
            nome_conta: data.nome_conta,
            tipo_conta: data.tipo_conta,
            natureza: data.natureza,
            id_pai: data.id_pai,
            codigo_estruturado: data.codigo_estruturado,
          })
          .eq("id", conta.id);

        if (error) throw error;
        toast.success("Conta atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("vx_fin_plano_contas")
          .insert({
            nome_conta: data.nome_conta,
            tipo_conta: data.tipo_conta,
            natureza: data.natureza,
            id_pai: data.id_pai,
            codigo_estruturado: data.codigo_estruturado,
          });

        if (error) throw error;
        toast.success("Conta criada com sucesso!");
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
      toast.error("Erro ao salvar conta");
    } finally {
      setLoading(false);
    }
  };

  const getAvailableParents = (): PlanoContas[] => {
    if (!conta) return allContas;

    const getDescendantIds = (parentId: string): string[] => {
      const children = allContas.filter((c) => c.id_pai === parentId);
      return children.flatMap((c) => [c.id, ...getDescendantIds(c.id)]);
    };

    const excludeIds = new Set([conta.id, ...getDescendantIds(conta.id)]);
    return allContas.filter((c) => !excludeIds.has(c.id));
  };

  const codigoEstruturado = form.watch("codigo_estruturado");
  const availableParents = getAvailableParents();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {conta
              ? `Editar Conta - ${codigoEstruturado || ""}`
              : `Nova Conta${codigoEstruturado ? ` - ${codigoEstruturado}` : ""}`}
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
              name="nome_conta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Conta *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ativo Circulante" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!parentConta && (
              <FormField
                control={form.control}
                name="id_pai"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta Pai (opcional)</FormLabel>
                    <FormControl>
                      <PlanoContasAutocomplete
                        contas={availableParents}
                        value={field.value || "__none__"}
                        onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                        placeholder="Selecione a conta pai"
                        includeNoneOption
                        noneOptionLabel="Nenhuma (Conta Raiz)"
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
                  <FormLabel>Tipo da Conta *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
              name="natureza"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Natureza (opcional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                    value={field.value || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a natureza" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      <SelectItem value="Devedora">Devedora</SelectItem>
                      <SelectItem value="Credora">Credora</SelectItem>
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
                {conta ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
