import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { maskCurrency, unmaskCurrency } from "@/features/estoque/utils/masks";

const BANDEIRAS = [
  "Visa",
  "Mastercard",
  "Elo",
  "American Express",
  "Hipercard",
  "Diners Club",
  "Alelo",
  "Sodexo",
  "VR",
  "Ticket",
  "Outros",
];

const formSchema = z.object({
  id_forma_pagamento: z.string().min(1, "Forma de pagamento é obrigatória"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  nome_impresso: z.string().min(1, "Nome impresso é obrigatório"),
  final: z
    .string()
    .length(4, "Final do cartão deve ter 4 dígitos")
    .regex(/^\d{4}$/, "Final deve conter apenas números"),
  bandeira: z.string().min(1, "Bandeira é obrigatória"),
  limite: z.string().min(1, "Limite é obrigatório"),
  dia_fechamento: z.coerce
    .number()
    .min(1, "Dia inválido")
    .max(31, "Dia inválido"),
  dia_vencimento: z.coerce
    .number()
    .min(1, "Dia inválido")
    .max(31, "Dia inválido"),
  ativo: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface FormaPagamento {
  id: string;
  descricao: string;
  ativa: boolean;
}

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

interface CartaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartao: Cartao | null;
  onSuccess: () => void;
}

export function CartaoDialog({
  open,
  onOpenChange,
  cartao,
  onSuccess,
}: CartaoDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [loadingFormas, setLoadingFormas] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id_forma_pagamento: "",
      descricao: "",
      nome_impresso: "",
      final: "",
      bandeira: "",
      limite: "",
      dia_fechamento: 1,
      dia_vencimento: 10,
      ativo: true,
    },
  });

  // Fetch formas de pagamento
  useEffect(() => {
    const fetchFormas = async () => {
      setLoadingFormas(true);
      try {
        const { data, error } = await supabase
          .from("vx_forma_pagamento")
          .select("*")
          .eq("ativa", true)
          .order("descricao");

        if (error) throw error;
        setFormasPagamento(data || []);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar formas de pagamento",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoadingFormas(false);
      }
    };

    if (open) {
      fetchFormas();
    }
  }, [open, toast]);

  // Reset form when dialog opens/closes or cartao changes
  useEffect(() => {
    if (open) {
      if (cartao) {
        form.reset({
          id_forma_pagamento: cartao.id_forma_pagamento,
          descricao: cartao.descricao,
          nome_impresso: cartao.nome_impresso,
          final: cartao.final,
          bandeira: cartao.bandeira,
          limite: maskCurrency(cartao.limite),
          dia_fechamento: cartao.dia_fechamento,
          dia_vencimento: cartao.dia_vencimento,
          ativo: cartao.ativo,
        });
      } else {
        form.reset({
          id_forma_pagamento: "",
          descricao: "",
          nome_impresso: "",
          final: "",
          bandeira: "",
          limite: "",
          dia_fechamento: 1,
          dia_vencimento: 10,
          ativo: true,
        });
      }
    }
  }, [open, cartao, form]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      // Get empresa ID
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuario")
        .select("config")
        .eq("uid", userData.user.id)
        .maybeSingle();

      if (usuarioError) throw usuarioError;
      if (!usuarioData?.config) throw new Error("Configuração não encontrada");

      const { data: empresaData, error: empresaError } = await supabase
        .from("empresa")
        .select("id")
        .eq("id_config", usuarioData.config)
        .maybeSingle();

      if (empresaError) throw empresaError;
      if (!empresaData) throw new Error("Empresa não encontrada");

      const limiteNumerico = unmaskCurrency(data.limite);

      const cartaoData = {
        id_empresa: empresaData.id,
        id_forma_pagamento: data.id_forma_pagamento,
        descricao: data.descricao,
        nome_impresso: data.nome_impresso,
        final: data.final,
        bandeira: data.bandeira,
        limite: limiteNumerico,
        dia_fechamento: data.dia_fechamento,
        dia_vencimento: data.dia_vencimento,
        ativo: data.ativo,
      };

      if (cartao) {
        const { error } = await supabase
          .from("vx_fin_cartao")
          .update(cartaoData)
          .eq("id", cartao.id);

        if (error) throw error;

        toast({
          title: "Cartão atualizado",
          description: "Os dados do cartão foram atualizados com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("vx_fin_cartao")
          .insert(cartaoData);

        if (error) throw error;

        toast({
          title: "Cartão criado",
          description: "O cartão foi cadastrado com sucesso.",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/50 sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cartao ? "Editar Cartão" : "Novo Cartão de Crédito"}
          </DialogTitle>
        </DialogHeader>

        {loadingFormas ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="ml-2 text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="id_forma_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pagamento *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue placeholder="Selecione a forma de pagamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {formasPagamento.map((fp) => (
                          <SelectItem key={fp.id} value={fp.id}>
                            {fp.descricao}
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
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Cartão Empresarial Nubank"
                        className="bg-background/50 border-border/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome_impresso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Impresso *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: JOAO DA SILVA"
                        className="bg-background/50 border-border/50 uppercase"
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="final"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final do Cartão *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="1234"
                          maxLength={4}
                          className="bg-background/50 border-border/50"
                          onChange={(e) =>
                            field.onChange(e.target.value.replace(/\D/g, ""))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bandeira"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bandeira *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BANDEIRAS.map((bandeira) => (
                            <SelectItem key={bandeira} value={bandeira}>
                              {bandeira}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="limite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="R$ 0,00"
                        className="bg-background/50 border-border/50"
                        onChange={(e) => {
                          const masked = maskCurrency(e.target.value);
                          field.onChange(masked);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dia_fechamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia do Fechamento *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          {...field}
                          className="bg-background/50 border-border/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dia_vencimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia do Vencimento *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          {...field}
                          className="bg-background/50 border-border/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-background/30">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Cartão disponível para uso
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="border-border/50"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-accent hover:bg-accent/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : cartao ? (
                    "Salvar Alterações"
                  ) : (
                    "Cadastrar Cartão"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
