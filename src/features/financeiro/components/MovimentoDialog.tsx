import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, addMonths, setDate, lastDayOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Car, Repeat, ChevronsUpDown } from "lucide-react";
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
import {
  TipoRecorrencia,
  generateRecorrenciaId,
  formatarDescricaoRecorrente,
} from "../utils/recorrenciaUtils";
import { CategoriaAutocomplete } from "./CategoriaAutocomplete";
import { AnexosManager } from "./AnexosManager";

// Generate competencia options from 01/2019 to current month/year
const gerarOpcoesCompetencia = (): { value: string; label: string }[] => {
  const opcoes: { value: string; label: string }[] = [];
  const dataInicio = new Date(2019, 0, 1); // Janeiro 2019
  const dataAtual = new Date();
  
  let dataIteracao = new Date(dataInicio);
  while (dataIteracao <= dataAtual) {
    const mes = String(dataIteracao.getMonth() + 1).padStart(2, '0');
    const ano = dataIteracao.getFullYear();
    const value = `${mes}/${ano}`;
    opcoes.push({ value, label: value });
    dataIteracao = addMonths(dataIteracao, 1);
  }
  
  return opcoes.reverse(); // Most recent first
};

const getCompetenciaAtual = () => {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  return `${mes}/${ano}`;
};

const opcoesCompetencia = gerarOpcoesCompetencia();

const formSchema = z.object({
  tipo_movimento: z.enum(["Pagar", "Receber"]),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor_bruto: z.string().min(1, "Valor é obrigatório"),
  data_vencimento: z.date({ required_error: "Data de vencimento é obrigatória" }),
  competencia: z.string().optional(),
  id_conta: z.string().min(1, "Conta é obrigatória"),
  id_categoria: z.string().min(1, "Categoria é obrigatória"),
  id_forma_pagamento: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.string().default("Pendente"),
});

type FormData = z.infer<typeof formSchema>;

interface Conta {
  id: string;
  banco: string;
  descricao: string | null;
  padrao: boolean;
}

interface Pessoa {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
}

interface Categoria {
  id: string;
  categoria: string;
  operacao: string;
  id_categoria_pai: string | null;
}

interface FormaPagamento {
  id: string;
  descricao: string;
  ativa: boolean;
}

interface Cartao {
  id: string;
  descricao: string | null;
  final: string;
  id_forma_pagamento: string;
  ativo: boolean;
  dia_fechamento: number;
  dia_vencimento: number;
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
  data_compra: string | null;
  id_conta: string;
  id_categoria: string;
  id_empresa: string;
  id_forma_pagamento: string | null;
  id_cartao: string | null;
  id_pessoa: string | null;
  observacoes: string | null;
  status: string;
  id_estoque: number | null;
  competencia?: string | null;
  recorrencia_id?: string | null;
  ordem_ocorrencia?: number | null;
  total_ocorrencias?: number | null;
}

interface MovimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimento?: Movimento | null;
  defaultTipo?: "Pagar" | "Receber";
  onSuccess: () => void;
  editScope?: "single" | "future";
  initialVehicleId?: number;
  defaultValor?: number;
  defaultPessoaId?: string | null;
}

export function MovimentoDialog({
  open,
  onOpenChange,
  movimento,
  defaultTipo = "Receber",
  onSuccess,
  editScope = "single",
  initialVehicleId,
  defaultValor,
  defaultPessoaId,
}: MovimentoDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [contas, setContas] = useState<Conta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [vincularVeiculo, setVincularVeiculo] = useState(false);
  const [pessoaSelecionada, setPessoaSelecionada] = useState<string>("");
  const [pessoaSearchTerm, setPessoaSearchTerm] = useState("");
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<string>("");
  const [cartaoSelecionado, setCartaoSelecionado] = useState<string>("");

  // Recurrence state
  const [tipoRecorrencia, setTipoRecorrencia] = useState<TipoRecorrencia>("nao_recorrente");
  const [numeroOcorrencias, setNumeroOcorrencias] = useState(12);
  const [intervaloDias, setIntervaloDias] = useState(30);
  const [diaFixoMes, setDiaFixoMes] = useState(10);
  const [valorOcorrenciaDiaMes, setValorOcorrenciaDiaMes] = useState("");
  const [dataCompra, setDataCompra] = useState<Date | undefined>(new Date());

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo_movimento: defaultTipo,
      descricao: "",
      valor_bruto: "",
      data_vencimento: new Date(),
      competencia: getCompetenciaAtual(),
      id_conta: "",
      id_categoria: "",
      id_forma_pagamento: "",
      observacoes: "",
      status: "Pendente",
    },
  });

  const tipoMovimento = form.watch("tipo_movimento");
  const formaPagamentoSelecionada = form.watch("id_forma_pagamento");
  const isEditing = !!movimento;

  // Filtra cartões ativos vinculados à forma de pagamento selecionada
  const cartoesDisponiveis = cartoes.filter(
    (c) => c.id_forma_pagamento === formaPagamentoSelecionada && c.ativo
  );
  const temCartoesVinculados = cartoesDisponiveis.length > 0;

  // Fetch contas, categorias e veículos
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const tresMesesAtras = new Date();
        tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

        const [contasRes, categoriasRes, formasPagamentoRes, cartoesRes, veiculosEstoqueRes, vendasRecentesRes, pessoasRes] = await Promise.all([
          supabase.from("vx_fin_conta").select("id, banco, descricao, padrao").order("banco"),
          supabase.from("vx_fin_categoria").select("*").eq("ativo", true).order("categoria"),
          supabase.from("vx_forma_pagamento").select("*").eq("ativa", true).order("descricao"),
          supabase.from("vx_fin_cartao").select("id, descricao, final, id_forma_pagamento, ativo, dia_fechamento, dia_vencimento").eq("ativo", true).order("descricao"),
          supabase
            .from("estoque")
            .select("id, fabricante, modelo, placa, ano, status")
            .neq("status", "Vendido")
            .order("fabricante")
            .order("modelo"),
          supabase
            .from("vx_vendas")
            .select(`
              id_veiculo_vendido,
              estoque!id_veiculo_vendido (id, fabricante, modelo, placa, ano, status)
            `)
            .eq("fechada", true)
            .gte("data_venda", tresMesesAtras.toISOString()),
          supabase.from("vx_pessoa").select("id, nome, cpf_cnpj").order("nome"),
        ]);

        if (contasRes.error) throw contasRes.error;
        if (formasPagamentoRes.error) throw formasPagamentoRes.error;
        if (cartoesRes.error) throw cartoesRes.error;
        if (categoriasRes.error) throw categoriasRes.error;
        if (veiculosEstoqueRes.error) throw veiculosEstoqueRes.error;
        if (vendasRecentesRes.error) throw vendasRecentesRes.error;
        if (pessoasRes.error) throw pessoasRes.error;

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

        setContas((contasRes.data || []) as Conta[]);
        setCategorias(categoriasRes.data || []);
        setFormasPagamento(formasPagamentoRes.data || []);
        setCartoes((cartoesRes.data || []) as Cartao[]);
        setVeiculos(todosVeiculos);
        setPessoas((pessoasRes.data || []) as Pessoa[]);
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
          competencia: movimento.competencia || getCompetenciaAtual(),
          id_conta: movimento.id_conta,
          id_categoria: movimento.id_categoria,
          id_forma_pagamento: movimento.id_forma_pagamento || "",
          observacoes: movimento.observacoes || "",
          status: movimento.status,
        });
        if (movimento.id_estoque) {
          setVincularVeiculo(true);
          setVeiculoSelecionado(movimento.id_estoque.toString());
        } else {
          setVincularVeiculo(false);
          setVeiculoSelecionado("");
        }
        // Set cartao if exists
        setCartaoSelecionado(movimento.id_cartao || "");
        // Set data_compra if exists - default to current date if not set
        setDataCompra(movimento.data_compra ? new Date(movimento.data_compra + "T00:00:00") : new Date());
        // Set pessoa if exists
        setPessoaSelecionada(movimento.id_pessoa || "");
        setPessoaSearchTerm("");
        // Reset recurrence fields when editing
        setTipoRecorrencia("nao_recorrente");
        setNumeroOcorrencias(12);
        setIntervaloDias(30);
        setDiaFixoMes(10);
        setValorOcorrenciaDiaMes("");
      } else {
        form.reset({
          tipo_movimento: defaultTipo,
          descricao: "",
          valor_bruto: defaultValor ? maskCurrency(defaultValor) : "",
          data_vencimento: new Date(),
          competencia: getCompetenciaAtual(),
          id_conta: "",
          id_categoria: "",
          id_forma_pagamento: "",
          observacoes: "",
          status: "Pendente",
        });
        // Check if initialVehicleId was passed
        if (initialVehicleId) {
          setVincularVeiculo(true);
          setVeiculoSelecionado(initialVehicleId.toString());
        } else {
          setVincularVeiculo(false);
          setVeiculoSelecionado("");
        }
        setCartaoSelecionado("");
        setDataCompra(new Date());
        // Set pessoa if defaultPessoaId was passed
        setPessoaSelecionada(defaultPessoaId || "");
        setPessoaSearchTerm("");
        setTipoRecorrencia("nao_recorrente");
        setNumeroOcorrencias(12);
        setIntervaloDias(30);
        setDiaFixoMes(10);
        setValorOcorrenciaDiaMes("");
      }
    }
  }, [open, movimento, defaultTipo, form, initialVehicleId, defaultValor, defaultPessoaId]);

  // Set default conta when contas are loaded (new entry only)
  useEffect(() => {
    if (open && !movimento && contas.length > 0) {
      const contaPadrao = contas.find((c) => c.padrao);
      if (contaPadrao && !form.getValues("id_conta")) {
        form.setValue("id_conta", contaPadrao.id);
      }
    }
  }, [open, movimento, contas, form]);

  // Sync dataCompra -> data_vencimento (only when not using credit card)
  useEffect(() => {
    if (dataCompra && !cartaoSelecionado) {
      form.setValue("data_vencimento", dataCompra);
    }
  }, [dataCompra, cartaoSelecionado, form]);

  const getContaDisplayName = (conta: Conta) => {
    return conta.descricao ? `${conta.banco} - ${conta.descricao}` : conta.banco;
  };

  const getVeiculoDisplayName = (veiculo: Veiculo) => {
    const parts = [veiculo.fabricante, veiculo.modelo, veiculo.ano].filter(Boolean);
    const base = parts.join(" ") || "Veículo sem nome";
    const withPlaca = veiculo.placa ? `${base} - ${veiculo.placa}` : base;
    return veiculo.status === "Vendido" ? `${withPlaca} [Vendido]` : withPlaca;
  };

  const getCartaoDisplayName = (cartao: Cartao) => {
    return `${cartao.descricao || "Cartão"} - ${cartao.final}`;
  };

  // Limpar seleção de cartão quando forma de pagamento mudar e não tiver cartões vinculados
  useEffect(() => {
    if (!temCartoesVinculados) {
      setCartaoSelecionado("");
    }
  }, [formaPagamentoSelecionada, temCartoesVinculados]);

  // Obter o cartão selecionado atual
  const cartaoAtual = cartoesDisponiveis.find(c => c.id === cartaoSelecionado);

  // Calcular competência da fatura baseado na data de compra e dia de fechamento
  // Regra: Se dia_da_compra <= dia_de_fechamento: entra na fatura do mês ATUAL
  //        Senão: entra na fatura do PRÓXIMO mês
  const calcularCompetenciaFatura = (dataCompraValue: Date, diaFechamento: number): { competencia: string; dataVencimento: Date } => {
    const diaCompra = dataCompraValue.getDate();
    let mesFatura = dataCompraValue.getMonth();
    let anoFatura = dataCompraValue.getFullYear();
    
    // Se a compra for APÓS o dia de fechamento, vai para a fatura do PRÓXIMO mês
    if (diaCompra > diaFechamento) {
      mesFatura += 1;
      if (mesFatura > 11) {
        mesFatura = 0;
        anoFatura += 1;
      }
    }
    // Se diaCompra <= diaFechamento, permanece no mês atual
    
    // Competência = mês/ano da fatura (1-indexed para exibição)
    const competencia = `${String(mesFatura + 1).padStart(2, '0')}/${anoFatura}`;
    
    // Data de vencimento = dia_vencimento do cartão no mês da fatura
    const cartaoVencimento = cartaoAtual?.dia_vencimento || 10;
    const ultimoDiaMesFatura = lastDayOfMonth(new Date(anoFatura, mesFatura, 1)).getDate();
    const diaVencimentoReal = Math.min(cartaoVencimento, ultimoDiaMesFatura);
    const dataVencimento = new Date(anoFatura, mesFatura, diaVencimentoReal);
    
    return { competencia, dataVencimento };
  };

  // Atualizar competência e data_vencimento quando data_compra ou cartão mudar
  useEffect(() => {
    if (cartaoSelecionado && dataCompra && cartaoAtual) {
      const { competencia, dataVencimento } = calcularCompetenciaFatura(dataCompra, cartaoAtual.dia_fechamento);
      form.setValue("competencia", competencia);
      form.setValue("data_vencimento", dataVencimento);
    }
  }, [dataCompra, cartaoSelecionado, cartaoAtual]);

  // Gerar datas de vencimento para parcelas de cartão de crédito
  // Cada parcela vai para a fatura do mês seguinte
  const gerarDatasVencimentoCartao = (dataCompraValue: Date, diaFechamento: number, diaVencimento: number, numParcelas: number): Date[] => {
    const datas: Date[] = [];
    const diaCompra = dataCompraValue.getDate();
    
    // Determinar o mês da primeira fatura
    let mesFatura = dataCompraValue.getMonth();
    let anoFatura = dataCompraValue.getFullYear();
    
    // Se compra APÓS fechamento, primeira parcela vai para próximo mês
    if (diaCompra > diaFechamento) {
      mesFatura += 1;
      if (mesFatura > 11) {
        mesFatura = 0;
        anoFatura += 1;
      }
    }
    
    // Gerar data de vencimento para cada parcela
    for (let i = 0; i < numParcelas; i++) {
      let mesVencimento = mesFatura + i;
      let anoVencimento = anoFatura;
      
      // Ajustar ano se ultrapassar dezembro
      while (mesVencimento > 11) {
        mesVencimento -= 12;
        anoVencimento += 1;
      }
      
      // Usar dia_vencimento do cartão, respeitando último dia do mês
      const ultimoDiaMes = lastDayOfMonth(new Date(anoVencimento, mesVencimento, 1)).getDate();
      const diaVencimentoReal = Math.min(diaVencimento, ultimoDiaMes);
      
      datas.push(new Date(anoVencimento, mesVencimento, diaVencimentoReal));
    }
    
    return datas;
  };

  // Generate recurrence dates
  const gerarDatasRecorrencia = (dataInicial: Date): Date[] => {
    if (tipoRecorrencia === "nao_recorrente") {
      return [dataInicial];
    }

    const datas: Date[] = [];

    if (tipoRecorrencia === "por_ocorrencias" || tipoRecorrencia === "intervalo_dias") {
      for (let i = 0; i < numeroOcorrencias; i++) {
        datas.push(addDays(dataInicial, i * intervaloDias));
      }
    } else if (tipoRecorrencia === "dia_mes") {
      for (let i = 0; i < numeroOcorrencias; i++) {
        const mesBase = addMonths(dataInicial, i);
        const ultimoDiaMes = lastDayOfMonth(mesBase).getDate();
        const diaReal = Math.min(diaFixoMes, ultimoDiaMes);
        const dataOcorrencia = setDate(mesBase, diaReal);
        datas.push(dataOcorrencia);
      }
    }

    return datas;
  };

  const onSubmit = async (data: FormData) => {
    // Validar data_compra obrigatória
    if (!dataCompra) {
      toast({
        title: "Campo obrigatório",
        description: tipoMovimento === "Pagar" 
          ? "Data da Compra/Despesa é obrigatória." 
          : "Data da Venda/Receita é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
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

      if (movimento) {
        // Editing existing
        const baseMovimentoData = {
          tipo_movimento: data.tipo_movimento,
          valor_bruto: valorNumerico,
          valor_liquido: valorNumerico,
          id_conta: data.id_conta,
          id_categoria: data.id_categoria,
          id_forma_pagamento: data.id_forma_pagamento || null,
          id_cartao: cartaoSelecionado || null,
          id_pessoa: pessoaSelecionada || null,
          data_compra: dataCompra ? format(dataCompra, "yyyy-MM-dd") : null,
          id_empresa: empresaData.id,
          observacoes: data.observacoes || null,
          competencia: data.competencia || null,
          id_estoque: vincularVeiculo && veiculoSelecionado
            ? parseInt(veiculoSelecionado)
            : null,
        };

        if (editScope === "future" && movimento.recorrencia_id) {
          // Update this and all future occurrences
          const { data: registrosFuturos, error: fetchError } = await supabase
            .from("vx_fin_movimento")
            .select("id, ordem_ocorrencia, total_ocorrencias, data_vencimento")
            .eq("recorrencia_id", movimento.recorrencia_id)
            .gte("ordem_ocorrencia", movimento.ordem_ocorrencia || 0)
            .order("ordem_ocorrencia", { ascending: true });

          if (fetchError) throw fetchError;

          if (registrosFuturos && registrosFuturos.length > 0) {
            // Remove numbering from description for base
            const descricaoBase = data.descricao.replace(/\s*\(\d+\/\d+\)$/, "");

            // Se for cartão de crédito, recalcular vencimentos corretamente por parcela
            const cartaoId = cartaoSelecionado || movimento.id_cartao;
            const cartaoParaCalculo = cartaoId ? cartoes.find((c) => c.id === cartaoId) : null;
            const total = (registrosFuturos[0]?.total_ocorrencias ?? registrosFuturos.length) as number;

            const datasCartao =
              cartaoParaCalculo && dataCompra
                ? gerarDatasVencimentoCartao(
                    dataCompra,
                    cartaoParaCalculo.dia_fechamento,
                    cartaoParaCalculo.dia_vencimento,
                    total
                  )
                : null;

            // Fallback: manter lógica anterior (intervalo em dias baseado no histórico)
            let intervaloDiasCalculado = 30;
            if (!datasCartao && registrosFuturos.length > 1) {
              const data1 = new Date(registrosFuturos[0].data_vencimento);
              const data2 = new Date(registrosFuturos[1].data_vencimento);
              intervaloDiasCalculado = Math.round(
                (data2.getTime() - data1.getTime()) / (1000 * 60 * 60 * 24)
              );
            }

            // Update each record
            for (let i = 0; i < registrosFuturos.length; i++) {
              const registro = registrosFuturos[i];
              const ordem = registro.ordem_ocorrencia || (i + 1);
              const totalOc = registro.total_ocorrencias || registrosFuturos.length;

              const novaDescricao = formatarDescricaoRecorrente(descricaoBase, ordem, totalOc);

              // Calculate new due date
              let novaDataVencimento: string;
              let novaCompetencia: string | null = baseMovimentoData.competencia ?? null;

              if (datasCartao) {
                const idx = Math.max(0, ordem - 1);
                const dataOcorrencia = datasCartao[idx] ?? datasCartao[datasCartao.length - 1];
                novaDataVencimento = format(dataOcorrencia, "yyyy-MM-dd");
                novaCompetencia = `${String(dataOcorrencia.getMonth() + 1).padStart(2, "0")}/${dataOcorrencia.getFullYear()}`;
              } else if (i === 0) {
                novaDataVencimento = format(data.data_vencimento, "yyyy-MM-dd");
              } else {
                const dataBase = addDays(data.data_vencimento, intervaloDiasCalculado * i);
                novaDataVencimento = format(dataBase, "yyyy-MM-dd");
              }

              const { error: updateError } = await supabase
                .from("vx_fin_movimento")
                .update({
                  ...baseMovimentoData,
                  descricao: novaDescricao,
                  data_vencimento: novaDataVencimento,
                  competencia: novaCompetencia,
                  // Preserve individual status
                })
                .eq("id", registro.id);

              if (updateError) throw updateError;
            }

            toast({
              title: "Lançamentos atualizados",
              description: `${registrosFuturos.length} lançamentos foram atualizados.`,
            });
          }
        } else {
          // Update only this record
          const { error } = await supabase
            .from("vx_fin_movimento")
            .update({
              ...baseMovimentoData,
              descricao: data.descricao,
              data_vencimento: format(data.data_vencimento, "yyyy-MM-dd"),
              status: data.status,
            })
            .eq("id", movimento.id);

          if (error) throw error;

          toast({
            title: "Lançamento atualizado",
            description: "O lançamento foi atualizado com sucesso.",
          });
        }
      } else {
        // Creating new - check for recurrence
        if (tipoRecorrencia === "nao_recorrente") {
          // Single entry
          const movimentoData = {
            tipo_movimento: data.tipo_movimento,
            descricao: data.descricao,
            valor_bruto: valorNumerico,
            valor_liquido: valorNumerico,
            data_vencimento: format(data.data_vencimento, "yyyy-MM-dd"),
            competencia: data.competencia || null,
            id_conta: data.id_conta,
            id_categoria: data.id_categoria,
            id_forma_pagamento: data.id_forma_pagamento || null,
            id_cartao: cartaoSelecionado || null,
            id_pessoa: pessoaSelecionada || null,
            data_compra: dataCompra ? format(dataCompra, "yyyy-MM-dd") : null,
            id_empresa: empresaData.id,
            observacoes: data.observacoes || null,
            status: data.status,
            id_estoque: vincularVeiculo && veiculoSelecionado
              ? parseInt(veiculoSelecionado)
              : null,
          };

          const { error } = await supabase
            .from("vx_fin_movimento")
            .insert(movimentoData);

          if (error) throw error;

          toast({
            title: "Lançamento criado",
            description: "O lançamento foi criado com sucesso.",
          });
        } else {
          // Multiple entries (recurrence)
          // Se tiver cartão selecionado, usar datas específicas de cartão
          let datas: Date[];
          
          // Buscar o cartão diretamente do array cartoes para evitar closure stale
          const cartaoParaCalculo = cartaoSelecionado 
            ? cartoes.find(c => c.id === cartaoSelecionado) 
            : null;
          
          if (cartaoSelecionado && dataCompra && cartaoParaCalculo) {
            datas = gerarDatasVencimentoCartao(
              dataCompra, 
              cartaoParaCalculo.dia_fechamento, 
              cartaoParaCalculo.dia_vencimento, 
              numeroOcorrencias
            );
          } else {
            datas = gerarDatasRecorrencia(data.data_vencimento);
          }
          
          const recorrenciaId = generateRecorrenciaId();
          const totalOcorrencias = datas.length;

          const movimentosParaInserir = datas.map((dataOcorrencia, index) => {
            // Calcular competência para cada parcela (mês/ano da fatura)
            const competenciaParcela = cartaoSelecionado 
              ? `${String(dataOcorrencia.getMonth() + 1).padStart(2, '0')}/${dataOcorrencia.getFullYear()}`
              : data.competencia || null;
            
            return {
              tipo_movimento: data.tipo_movimento,
              descricao: formatarDescricaoRecorrente(data.descricao, index + 1, totalOcorrencias),
              valor_bruto: valorNumerico,
              valor_liquido: valorNumerico,
              data_vencimento: format(dataOcorrencia, "yyyy-MM-dd"),
              competencia: competenciaParcela,
              id_conta: data.id_conta,
              id_categoria: data.id_categoria,
              id_forma_pagamento: data.id_forma_pagamento || null,
              id_cartao: cartaoSelecionado || null,
              id_pessoa: pessoaSelecionada || null,
              data_compra: dataCompra ? format(dataCompra, "yyyy-MM-dd") : null,
              id_empresa: empresaData.id,
              observacoes: data.observacoes || null,
              status: "Pendente",
              id_estoque: vincularVeiculo && veiculoSelecionado
                ? parseInt(veiculoSelecionado)
                : null,
              recorrencia_id: recorrenciaId,
              ordem_ocorrencia: index + 1,
              total_ocorrencias: totalOcorrencias,
            };
          });

          const { error } = await supabase
            .from("vx_fin_movimento")
            .insert(movimentosParaInserir);

          if (error) throw error;

          toast({
            title: "Lançamentos criados",
            description: `${totalOcorrencias} lançamentos recorrentes foram criados com sucesso.`,
          });
        }
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

  // Calculate preview of dates for recurrence
  const previewDatas = tipoRecorrencia !== "nao_recorrente" && !isEditing
    ? gerarDatasRecorrencia(form.watch("data_vencimento")).slice(0, 5)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/50 sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
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

              {/* Recurrence Section - Only for new entries - Moved here after Descrição */}
              {!isEditing && (
                <div className="space-y-4 border border-border/50 rounded-lg p-4 bg-background/30">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Repeat className="w-4 h-4" />
                    Lançamento Recorrente
                  </div>

                  <Select
                    value={tipoRecorrencia}
                    onValueChange={(v) => {
                      setTipoRecorrencia(v as TipoRecorrencia);
                      if (v !== "dia_mes") {
                        setValorOcorrenciaDiaMes("");
                      }
                    }}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao_recorrente">Não recorrente</SelectItem>
                      <SelectItem value="por_ocorrencias">Repetir por número de ocorrências</SelectItem>
                      <SelectItem value="intervalo_dias">Repetir a cada X dias</SelectItem>
                      <SelectItem value="dia_mes">Repetir todo dia X do mês</SelectItem>
                    </SelectContent>
                  </Select>

                  {tipoRecorrencia !== "nao_recorrente" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">Quantidade de ocorrências</Label>
                          <Input
                            type="number"
                            min={2}
                            max={120}
                            value={numeroOcorrencias}
                            onChange={(e) => setNumeroOcorrencias(Math.max(2, parseInt(e.target.value) || 2))}
                            className="bg-background/50 border-border/50 mt-1"
                          />
                        </div>

                        {(tipoRecorrencia === "por_ocorrencias" || tipoRecorrencia === "intervalo_dias") && (
                          <div>
                            <Label className="text-sm">Intervalo em dias</Label>
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              value={intervaloDias}
                              onChange={(e) => setIntervaloDias(Math.max(1, parseInt(e.target.value) || 1))}
                              className="bg-background/50 border-border/50 mt-1"
                            />
                          </div>
                        )}

                        {tipoRecorrencia === "dia_mes" && (
                          <div>
                            <Label className="text-sm">Dia do mês</Label>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              value={diaFixoMes}
                              onChange={(e) => setDiaFixoMes(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                              className="bg-background/50 border-border/50 mt-1"
                            />
                          </div>
                        )}
                      </div>

                      {/* Valor de cada ocorrência - Only for dia_mes */}
                      {tipoRecorrencia === "dia_mes" && (
                        <div>
                          <Label className="text-sm">Valor de cada ocorrência</Label>
                          <Input
                            placeholder="R$ 0,00"
                            value={valorOcorrenciaDiaMes}
                            onChange={(e) => {
                              const masked = maskCurrency(e.target.value);
                              setValorOcorrenciaDiaMes(masked);
                              // Sincronizar com o campo Valor do formulário
                              form.setValue("valor_bruto", masked);
                            }}
                            className="bg-background/50 border-border/50 mt-1"
                          />
                        </div>
                      )}

                      {/* Preview */}
                      {previewDatas.length > 0 && (
                        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/30">
                          <p className="font-medium">Prévia das primeiras datas:</p>
                          <div className="flex flex-wrap gap-2">
                            {previewDatas.map((d, i) => (
                              <span key={i} className="bg-accent/10 text-accent px-2 py-1 rounded">
                                {format(d, "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            ))}
                            {numeroOcorrencias > 5 && (
                              <span className="text-muted-foreground">
                                ... +{numeroOcorrencias - 5} mais
                              </span>
                            )}
                          </div>

                          {/* Valor total de ocorrências - Only for dia_mes */}
                          {tipoRecorrencia === "dia_mes" && valorOcorrenciaDiaMes && (
                            <div className="pt-2 mt-2 border-t border-border/30">
                              <p className="font-medium text-foreground">
                                Valor total de ocorrências:{" "}
                                <span className="text-accent">
                                  {maskCurrency(unmaskCurrency(valorOcorrenciaDiaMes) * numeroOcorrencias)}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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
                          // Sincronizar com valorOcorrenciaDiaMes se estiver no modo dia_mes
                          if (tipoRecorrencia === "dia_mes") {
                            setValorOcorrenciaDiaMes(masked);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo Data da Compra/Despesa ou Data da Venda/Receita - sempre visível */}
              <div className="flex flex-col space-y-2">
                <Label>
                  {tipoMovimento === "Pagar" 
                    ? "Data da Compra/Despesa *" 
                    : "Data da Venda/Receita *"}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background/50 border-border/50",
                        !dataCompra && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataCompra ? (
                        format(dataCompra, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecione a data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataCompra}
                      onSelect={(date) => setDataCompra(date || new Date())}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <FormField
                control={form.control}
                name="data_vencimento"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      {tipoRecorrencia !== "nao_recorrente" && !isEditing
                        ? "Data Inicial *"
                        : "Data de Vencimento *"}
                    </FormLabel>
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
                name="competencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue placeholder="Selecione a competência" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {opcoesCompetencia.map((opcao) => (
                          <SelectItem key={opcao.value} value={opcao.value}>
                            {opcao.label}
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

              {/* Pessoa com Autocomplete */}
              <div className="space-y-2">
                <Label>Pessoa (Favorecido)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between bg-background/50 border-border/50",
                        !pessoaSelecionada && "text-muted-foreground"
                      )}
                    >
                      {pessoaSelecionada
                        ? pessoas.find((p) => p.id === pessoaSelecionada)?.nome || "Selecione a pessoa"
                        : "Selecione a pessoa"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="p-2">
                      <Input
                        placeholder="Buscar pessoa..."
                        value={pessoaSearchTerm}
                        onChange={(e) => setPessoaSearchTerm(e.target.value)}
                        className="bg-background/50 border-border/50"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      <div
                        className={cn(
                          "px-2 py-1.5 text-sm cursor-pointer hover:bg-accent/50",
                          !pessoaSelecionada && "bg-accent/30"
                        )}
                        onClick={() => {
                          setPessoaSelecionada("");
                          setPessoaSearchTerm("");
                        }}
                      >
                        Nenhuma
                      </div>
                      {pessoas
                        .filter((p) =>
                          p.nome.toLowerCase().includes(pessoaSearchTerm.toLowerCase()) ||
                          (p.cpf_cnpj && p.cpf_cnpj.includes(pessoaSearchTerm))
                        )
                        .slice(0, 50)
                        .map((pessoa) => (
                          <div
                            key={pessoa.id}
                            className={cn(
                              "px-2 py-1.5 text-sm cursor-pointer hover:bg-accent/50",
                              pessoaSelecionada === pessoa.id && "bg-accent/30"
                            )}
                            onClick={() => {
                              setPessoaSelecionada(pessoa.id);
                              setPessoaSearchTerm("");
                            }}
                          >
                            {pessoa.nome}
                            {pessoa.cpf_cnpj && (
                              <span className="text-muted-foreground ml-2 text-xs">
                                ({pessoa.cpf_cnpj})
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <FormField
                control={form.control}
                name="id_categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <FormControl>
                      <CategoriaAutocomplete
                        categorias={categorias.filter((cat) => {
                          if (tipoMovimento === "Receber") {
                            return cat.operacao === "Receber";
                          } else {
                            return cat.operacao === "Pagar";
                          }
                        })}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione a categoria"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_forma_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pagamento</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Limpar cartão quando forma de pagamento mudar
                        setCartaoSelecionado("");
                      }} 
                      value={field.value}
                    >
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

              {/* Seleção de Cartão de Crédito - apenas se a forma de pagamento tiver cartões vinculados */}
              {temCartoesVinculados && (
                <div className="space-y-4 border border-border/50 rounded-lg p-4 bg-background/30">
                  <div className="space-y-2">
                    <Label>Cartão de Crédito</Label>
                    <Select 
                      value={cartaoSelecionado} 
                      onValueChange={setCartaoSelecionado}
                    >
                      <SelectTrigger className="bg-background/50 border-border/50">
                        <SelectValue placeholder="Selecione o cartão" />
                      </SelectTrigger>
                      <SelectContent>
                        {cartoesDisponiveis.map((cartao) => (
                          <SelectItem key={cartao.id} value={cartao.id}>
                            {getCartaoDisplayName(cartao)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Data da Compra - apenas quando um cartão estiver selecionado */}
                  {cartaoSelecionado && (
                    <div className="space-y-2">
                      <Label>Data da Compra</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-background/50 border-border/50",
                              !dataCompra && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dataCompra ? (
                              format(dataCompra, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data da compra</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dataCompra}
                            onSelect={setDataCompra}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      {cartaoAtual && dataCompra && (
                        <p className="text-xs text-muted-foreground">
                          Fechamento dia {cartaoAtual.dia_fechamento} • Vencimento dia {cartaoAtual.dia_vencimento}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

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

              {/* Anexos Section - Only for existing movements */}
              {movimento && (
                <div className="border border-border/50 rounded-lg p-4 bg-background/30">
                  <AnexosManager movimentoId={movimento.id} />
                </div>
              )}

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
                  ) : tipoRecorrencia !== "nao_recorrente" ? (
                    `Criar ${numeroOcorrencias} Lançamentos`
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
