import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Car } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { maskCurrency, unmaskCurrency } from "@/features/estoque/utils/masks";

const formSchema = z.object({
  tipo_movimento: z.enum(["Pagar", "Receber"]),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor_bruto: z.string().min(1, "Valor é obrigatório"),
  data_vencimento: z.date({ required_error: "Data de vencimento é obrigatória" }),
  id_conta: z.string().min(1, "Conta é obrigatória"),
  id_categoria: z.string().min(1, "Categoria é obrigatória"),
  observacoes: z.string().optional(),
  status: z.string().default("Pendente"),
});

type FormData = z.infer<typeof formSchema>;

interface Conta {
  id: string;
  banco: string;
  descricao: string | null;
}

interface Categoria {
  id: string;
  categoria: string;
  operacao: string;
}

interface Veiculo {
  id: number;
  fabricante: string | null;
  modelo: string | null;
  placa: string | null;
  ano: string | null;
  status: string | null;
}

interface Movimento {
  id: string;
  tipo_movimento: string;
  descricao: string;
  valor_bruto: number;
  valor_liquido: number;
  data_vencimento: string;
  data_pagamento: string | null;
  id_conta: string;
  id_categoria: string;
  id_empresa: string;
  observacoes: string | null;
  status: string;
  id_estoque: number | null;
}

interface MovimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimento: Movimento | null;
  defaultTipo?: "Pagar" | "Receber";
  onSuccess: () => void;
}

export function MovimentoDialog({
  open,
  onOpenChange,
  movimento,
  defaultTipo = "Receber",
  onSuccess,
}: MovimentoDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [contas, setContas] = useState<Conta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [vincularVeiculo, setVincularVeiculo] = useState(false);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<string>("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo_movimento: defaultTipo,
      descricao: "",
      valor_bruto: "",
      data_vencimento: new Date(),
      id_conta: "",
      id_categoria: "",
      observacoes: "",
      status: "Pendente",
    },
  });

  const tipoMovimento = form.watch("tipo_movimento");

  // Fetch contas, categorias e veículos
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Calculate date 3 months ago
        const tresMesesAtras = new Date();
        tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

        const [contasRes, categoriasRes, veiculosEstoqueRes, vendasRecentesRes] = await Promise.all([
          supabase.from("vx_fin_conta").select("*").order("banco"),
          supabase.from("vx_fin_categoria").select("*").eq("ativo", true).order("categoria"),
          // Query 1: Veículos em estoque (não vendidos)
          supabase
            .from("estoque")
            .select("id, fabricante, modelo, placa, ano, status")
            .neq("status", "Vendido")
            .order("fabricante")
            .order("modelo"),
          // Query 2: Veículos vendidos nos últimos 3 meses
          supabase
            .from("vx_vendas")
            .select(`
              id_veiculo_vendido,
              estoque!id_veiculo_vendido (id, fabricante, modelo, placa, ano, status)
            `)
            .eq("fechada", true)
            .gte("data_venda", tresMesesAtras.toISOString()),
        ]);

        if (contasRes.error) throw contasRes.error;
        if (categoriasRes.error) throw categoriasRes.error;
        if (veiculosEstoqueRes.error) throw veiculosEstoqueRes.error;
        if (vendasRecentesRes.error) throw vendasRecentesRes.error;

        // Combine vehicles from stock + recently sold (without duplicates)
        const veiculosEmEstoque = (veiculosEstoqueRes.data || []) as Veiculo[];
        const veiculosVendidosRecentes = (vendasRecentesRes.data || [])
          .map((v: any) => v.estoque)
          .filter((v: any): v is Veiculo => v !== null);

        const todosVeiculosMap = new Map<number, Veiculo>();
        veiculosEmEstoque.forEach((v) => todosVeiculosMap.set(v.id, v));
        veiculosVendidosRecentes.forEach((v) => {
          if (!todosVeiculosMap.has(v.id)) {
            todosVeiculosMap.set(v.id, v);
          }
        });

        const todosVeiculos = Array.from(todosVeiculosMap.values())
          .sort((a, b) => {
            const fabA = a.fabricante || '';
            const fabB = b.fabricante || '';
            return fabA.localeCompare(fabB);
          });

        setContas(contasRes.data || []);
        setCategorias(categoriasRes.data || []);
        setVeiculos(todosVeiculos);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar dados",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open, toast]);

  // Reset form when dialog opens/closes or movimento changes
  useEffect(() => {
    if (open) {
      if (movimento) {
        form.reset({
          tipo_movimento: movimento.tipo_movimento as "Pagar" | "Receber",
          descricao: movimento.descricao,
          valor_bruto: maskCurrency(movimento.valor_bruto),
          data_vencimento: new Date(movimento.data_vencimento + "T00:00:00"),
          id_conta: movimento.id_conta,
          id_categoria: movimento.id_categoria,
          observacoes: movimento.observacoes || "",
          status: movimento.status,
        });
        // Set vehicle link state
        if (movimento.id_estoque) {
          setVincularVeiculo(true);
          setVeiculoSelecionado(movimento.id_estoque.toString());
        } else {
          setVincularVeiculo(false);
          setVeiculoSelecionado("");
        }
      } else {
        form.reset({
          tipo_movimento: defaultTipo,
          descricao: "",
          valor_bruto: "",
          data_vencimento: new Date(),
          id_conta: "",
          id_categoria: "",
          observacoes: "",
          status: "Pendente",
        });
        setVincularVeiculo(false);
        setVeiculoSelecionado("");
      }
    }
  }, [open, movimento, defaultTipo, form]);

  // Filter categorias based on tipo_movimento
  const filteredCategorias = categorias.filter((cat) => {
    if (tipoMovimento === "Receber") {
      return cat.operacao === "Receber";
    } else {
      return cat.operacao === "Pagar";
    }
  });

  const getContaDisplayName = (conta: Conta) => {
    return conta.descricao ? `${conta.banco} - ${conta.descricao}` : conta.banco;
  };

  const getVeiculoDisplayName = (veiculo: Veiculo) => {
    const parts = [veiculo.fabricante, veiculo.modelo, veiculo.ano].filter(Boolean);
    const base = parts.join(" ") || "Veículo sem nome";
    const withPlaca = veiculo.placa ? `${base} - ${veiculo.placa}` : base;
    return veiculo.status === "Vendido" ? `${withPlaca} [Vendido]` : withPlaca;
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      // Get empresa from usuario config
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

      const valorNumerico = unmaskCurrency(data.valor_bruto);

      const movimentoData = {
        tipo_movimento: data.tipo_movimento,
        descricao: data.descricao,
        valor_bruto: valorNumerico,
        valor_liquido: valorNumerico,
        data_vencimento: format(data.data_vencimento, "yyyy-MM-dd"),
        id_conta: data.id_conta,
        id_categoria: data.id_categoria,
        id_empresa: empresaData.id,
        observacoes: data.observacoes || null,
        status: data.status,
        id_estoque: vincularVeiculo && veiculoSelecionado
          ? parseInt(veiculoSelecionado)
          : null,
      };

      if (movimento) {
        const { error } = await supabase
          .from("vx_fin_movimento")
          .update(movimentoData)
          .eq("id", movimento.id);

        if (error) throw error;

        toast({
          title: "Lançamento atualizado",
          description: "O lançamento foi atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("vx_fin_movimento")
          .insert(movimentoData);

        if (error) throw error;

        toast({
          title: "Lançamento criado",
          description: "O lançamento foi criado com sucesso.",
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
      <DialogContent className="glass-strong border-border/50 sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {movimento ? "Editar Lançamento" : "Novo Lançamento"}
          </DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="ml-2 text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tipo_movimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo do Lançamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Receber">Receita (A Receber)</SelectItem>
                        <SelectItem value="Pagar">Despesa (A Pagar)</SelectItem>
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
                        placeholder="Ex: Pagamento de fornecedor"
                        className="bg-background/50 border-border/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor_bruto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor *</FormLabel>
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

              <FormField
                control={form.control}
                name="data_vencimento"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Vencimento *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-background/50 border-border/50",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_conta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contas.map((conta) => (
                          <SelectItem key={conta.id} value={conta.id}>
                            {getContaDisplayName(conta)}
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
                name="id_categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.categoria}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vincular a Veículo */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vincular-veiculo"
                    checked={vincularVeiculo}
                    onCheckedChange={(checked) => {
                      setVincularVeiculo(checked as boolean);
                      if (!checked) setVeiculoSelecionado("");
                    }}
                  />
                  <Label htmlFor="vincular-veiculo" className="cursor-pointer flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Atrelar Título a Veículo
                  </Label>
                </div>

                {vincularVeiculo && (
                  <Select
                    value={veiculoSelecionado}
                    onValueChange={setVeiculoSelecionado}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="Selecione o veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {veiculos.length === 0 ? (
                        <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                          Nenhum veículo disponível
                        </div>
                      ) : (
                        veiculos.map((v) => (
                          <SelectItem key={v.id} value={v.id.toString()}>
                            {getVeiculoDisplayName(v)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Observações adicionais..."
                        className="bg-background/50 border-border/50 min-h-[80px]"
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
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-accent hover:bg-accent/90"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : movimento ? (
                    "Atualizar"
                  ) : (
                    "Criar Lançamento"
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
