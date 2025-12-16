import { useState, useEffect, useRef, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  BarChart3,
  Loader2,
  TrendingUp,
  TrendingDown,
  Percent,
  FileText,
  ChevronRight,
  ChevronDown,
  Printer,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DREReportPrint from "@/features/financeiro/components/DREReportPrint";

interface Categoria {
  id: string;
  categoria: string;
  operacao: string;
  id_categoria_pai: string | null;
  dre: boolean;
  ativo: boolean;
}

interface CategoriaComValor extends Categoria {
  valor: number;
  filhos: CategoriaComValor[];
  movimentos: MovimentoDRE[];
  incluirNoDre: boolean;
}

interface MovimentoDRE {
  id: string;
  descricao: string | null;
  valor_liquido: number;
  data_pagamento: string | null;
  conta_nome: string | null;
  pessoa_nome: string | null;
}

interface ResumoGeral {
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
  percentualResultado: number;
}

const meses = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const anos = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

const FinanceiroDRE = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tipoRelatorio, setTipoRelatorio] = useState<"sintetico" | "analitico">("sintetico");
  const [mes, setMes] = useState((new Date().getMonth() + 1).toString().padStart(2, "0"));
  const [ano, setAno] = useState(currentYear.toString());
  
  const [categoriasDespesas, setCategoriasDespesas] = useState<CategoriaComValor[]>([]);
  const [categoriasReceitas, setCategoriasReceitas] = useState<CategoriaComValor[]>([]);
  const [resumo, setResumo] = useState<ResumoGeral>({
    totalReceitas: 0,
    totalDespesas: 0,
    resultado: 0,
    percentualResultado: 0,
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `DRE - ${mes}/${ano}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `,
  });

  // Calculate totals recursively based on checkbox state
  const calcularTotalCategoria = useCallback((categoria: CategoriaComValor): number => {
    if (!categoria.incluirNoDre) return 0;
    
    let total = categoria.valor;
    categoria.filhos.forEach(filho => {
      total += calcularTotalCategoria(filho);
    });
    return total;
  }, []);

  // Calculate summary based on current checkbox states
  const calcularResumo = useCallback(() => {
    let totalReceitas = 0;
    let totalDespesas = 0;

    categoriasReceitas.forEach(cat => {
      totalReceitas += calcularTotalCategoria(cat);
    });

    categoriasDespesas.forEach(cat => {
      totalDespesas += calcularTotalCategoria(cat);
    });

    const resultado = totalReceitas - totalDespesas;
    const percentualResultado = totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0;

    setResumo({
      totalReceitas,
      totalDespesas,
      resultado,
      percentualResultado,
    });
  }, [categoriasReceitas, categoriasDespesas, calcularTotalCategoria]);

  // Toggle checkbox for a category and update DRE status in database
  const toggleCategoriaDre = async (categoriaId: string, tipo: 'receitas' | 'despesas') => {
    const categorias = tipo === 'receitas' ? categoriasReceitas : categoriasDespesas;
    const setCategorias = tipo === 'receitas' ? setCategoriasReceitas : setCategoriasDespesas;

    // Find and update the category recursively
    const updateCategoryInTree = (cats: CategoriaComValor[]): CategoriaComValor[] => {
      return cats.map(cat => {
        if (cat.id === categoriaId) {
          return { ...cat, incluirNoDre: !cat.incluirNoDre };
        }
        if (cat.filhos.length > 0) {
          return { ...cat, filhos: updateCategoryInTree(cat.filhos) };
        }
        return cat;
      });
    };

    // Find current state
    const findCategory = (cats: CategoriaComValor[], id: string): CategoriaComValor | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        const found = findCategory(cat.filhos, id);
        if (found) return found;
      }
      return null;
    };

    const categoria = findCategory(categorias, categoriaId);
    if (!categoria) return;

    const newDreValue = !categoria.incluirNoDre;

    // Update local state immediately
    setCategorias(updateCategoryInTree(categorias));

    // Update database
    try {
      await supabase
        .from("vx_fin_categoria")
        .update({ dre: newDreValue })
        .eq("id", categoriaId);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Recalculate summary when categories change
  useEffect(() => {
    calcularResumo();
  }, [categoriasReceitas, categoriasDespesas, calcularResumo]);

  const fetchRelatorio = async () => {
    setLoading(true);
    try {
      const competencia = `${mes}/${ano}`;

      // Fetch categories
      const { data: categorias, error: categoriasError } = await supabase
        .from("vx_fin_categoria")
        .select("*")
        .eq("ativo", true);

      if (categoriasError) throw categoriasError;

      // Fetch paid movements for the competência
      const { data: movimentos, error: movimentosError } = await supabase
        .from("vx_fin_movimento")
        .select(`
          id,
          descricao,
          valor_liquido,
          data_pagamento,
          tipo_movimento,
          id_categoria,
          id_conta,
          id_pessoa,
          conta:vx_fin_conta(banco),
          pessoa:vx_pessoa(nome)
        `)
        .eq("status", "Pago")
        .eq("competencia", competencia);

      if (movimentosError) throw movimentosError;

      // Group movements by category
      const movimentosPorCategoria = new Map<string, MovimentoDRE[]>();
      const valoresPorCategoria = new Map<string, number>();

      (movimentos || []).forEach(mov => {
        if (!mov.id_categoria) return;

        const movDre: MovimentoDRE = {
          id: mov.id,
          descricao: mov.descricao,
          valor_liquido: Number(mov.valor_liquido) || 0,
          data_pagamento: mov.data_pagamento,
          conta_nome: (mov.conta as any)?.banco || null,
          pessoa_nome: (mov.pessoa as any)?.nome || null,
        };

        const existingMovs = movimentosPorCategoria.get(mov.id_categoria) || [];
        movimentosPorCategoria.set(mov.id_categoria, [...existingMovs, movDre]);

        const existingVal = valoresPorCategoria.get(mov.id_categoria) || 0;
        valoresPorCategoria.set(mov.id_categoria, existingVal + movDre.valor_liquido);
      });

      // Build hierarchical structure
      const buildHierarchy = (cats: Categoria[], parentId: string | null, operacao: string): CategoriaComValor[] => {
        return cats
          .filter(c => c.id_categoria_pai === parentId && c.operacao === operacao)
          .map(cat => ({
            ...cat,
            valor: valoresPorCategoria.get(cat.id) || 0,
            movimentos: movimentosPorCategoria.get(cat.id) || [],
            filhos: buildHierarchy(cats, cat.id, operacao),
            incluirNoDre: cat.dre,
          }))
          .sort((a, b) => a.categoria.localeCompare(b.categoria));
      };

      // Filter categories that have movements or children with movements
      const filterCategoriasComMovimentos = (cats: CategoriaComValor[]): CategoriaComValor[] => {
        return cats
          .map(cat => ({
            ...cat,
            filhos: filterCategoriasComMovimentos(cat.filhos),
          }))
          .filter(cat => cat.valor > 0 || cat.filhos.length > 0);
      };

      const despesasHierarchy = filterCategoriasComMovimentos(
        buildHierarchy(categorias || [], null, "Pagar")
      );
      const receitasHierarchy = filterCategoriasComMovimentos(
        buildHierarchy(categorias || [], null, "Receber")
      );

      setCategoriasDespesas(despesasHierarchy);
      setCategoriasReceitas(receitasHierarchy);

    } catch (error: any) {
      toast({
        title: "Erro ao carregar DRE",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatorio();
  }, [mes, ano]);

  const toggleExpanded = (id: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const mesLabel = meses.find((m) => m.value === mes)?.label || "";

  // Render category tree
  const renderCategoriaTree = (
    categoria: CategoriaComValor,
    nivel: number,
    tipo: 'receitas' | 'despesas'
  ) => {
    const hasChildren = categoria.filhos.length > 0;
    const hasMovimentos = categoria.movimentos.length > 0;
    const isExpanded = expandedCategories.has(categoria.id);
    const canExpand = hasChildren || (tipoRelatorio === "analitico" && hasMovimentos);
    const totalCategoria = calcularTotalCategoria(categoria);
    const colorClass = tipo === 'receitas' ? 'text-green-400' : 'text-red-400';

    return (
      <div key={categoria.id} className="w-full">
        <Collapsible open={isExpanded} onOpenChange={() => canExpand && toggleExpanded(categoria.id)}>
          <div
            className={cn(
              "flex items-center gap-2 py-2 px-2 hover:bg-background/30 rounded transition-colors",
              nivel > 0 && "ml-4"
            )}
            style={{ paddingLeft: `${nivel * 16 + 8}px` }}
          >
            <Checkbox
              checked={categoria.incluirNoDre}
              onCheckedChange={() => toggleCategoriaDre(categoria.id, tipo)}
              className="border-border/50"
            />
            
            {canExpand ? (
              <CollapsibleTrigger className="flex items-center gap-2 flex-1 cursor-pointer">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={cn(
                  "flex-1 text-left text-sm",
                  !categoria.incluirNoDre && "text-muted-foreground/50 line-through"
                )}>
                  {categoria.categoria}
                </span>
                <span className={cn(
                  "text-sm font-medium",
                  colorClass,
                  !categoria.incluirNoDre && "text-muted-foreground/50"
                )}>
                  {maskCurrency(totalCategoria)}
                </span>
              </CollapsibleTrigger>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <div className="w-4" />
                <span className={cn(
                  "flex-1 text-sm",
                  !categoria.incluirNoDre && "text-muted-foreground/50 line-through"
                )}>
                  {categoria.categoria}
                </span>
                <span className={cn(
                  "text-sm font-medium",
                  colorClass,
                  !categoria.incluirNoDre && "text-muted-foreground/50"
                )}>
                  {maskCurrency(totalCategoria)}
                </span>
              </div>
            )}
          </div>

          <CollapsibleContent>
            {/* Render child categories */}
            {categoria.filhos.map(filho => renderCategoriaTree(filho, nivel + 1, tipo))}
            
            {/* Render movements in analytic mode */}
            {tipoRelatorio === "analitico" && categoria.movimentos.length > 0 && (
              <div className="ml-8 border-l border-border/30 pl-4 my-2">
                {categoria.movimentos.map(mov => (
                  <div
                    key={mov.id}
                    className="flex items-center gap-4 py-1.5 text-xs text-muted-foreground"
                    style={{ paddingLeft: `${nivel * 16}px` }}
                  >
                    <span className="w-20">
                      {mov.data_pagamento ? format(new Date(mov.data_pagamento), "dd/MM/yy") : "-"}
                    </span>
                    <span className="flex-1 truncate">{mov.descricao || "-"}</span>
                    <span className="w-24 truncate">{mov.conta_nome || "-"}</span>
                    <span className="w-32 truncate">{mov.pessoa_nome || "-"}</span>
                    <span className={cn("w-24 text-right font-medium", colorClass)}>
                      {maskCurrency(mov.valor_liquido)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const hasData = categoriasDespesas.length > 0 || categoriasReceitas.length > 0;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="DRE - Demonstração do Resultado"
        description="Análise de receitas e despesas por competência"
        action={
          <div className="flex gap-2">
            {hasData && (
              <Button variant="outline" onClick={() => handlePrint()} disabled={loading}>
                <Printer className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="glass rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Mês</label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-[140px] bg-background/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Ano</label>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-[100px] bg-background/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Tipo</label>
            <Tabs value={tipoRelatorio} onValueChange={(v) => setTipoRelatorio(v as "sintetico" | "analitico")}>
              <TabsList className="bg-background/50">
                <TabsTrigger value="sintetico" className="data-[state=active]:bg-accent/20">
                  <FileText className="w-4 h-4 mr-2" />
                  Sintético
                </TabsTrigger>
                <TabsTrigger value="analitico" className="data-[state=active]:bg-accent/20">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analítico
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-lg p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="ml-3 text-muted-foreground">Carregando DRE...</span>
        </div>
      ) : !hasData ? (
        <div className="glass rounded-lg p-8">
          <EmptyState
            icon={BarChart3}
            title="Nenhum movimento encontrado"
            description={`Não há movimentos pagos na competência ${mesLabel} de ${ano}.`}
          />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass rounded-lg p-4 border-t-2 border-t-green-500">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Receitas</p>
                  <p className="text-xl font-bold text-green-400">
                    {maskCurrency(resumo.totalReceitas)}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-lg p-4 border-t-2 border-t-red-500">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Despesas</p>
                  <p className="text-xl font-bold text-red-400">
                    {maskCurrency(resumo.totalDespesas)}
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(
              "glass rounded-lg p-4 border-t-2",
              resumo.resultado >= 0 ? "border-t-green-500" : "border-t-red-500"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  resumo.resultado >= 0 ? "bg-green-500/20" : "bg-red-500/20"
                )}>
                  <DollarSign className={cn(
                    "w-5 h-5",
                    resumo.resultado >= 0 ? "text-green-400" : "text-red-400"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resultado</p>
                  <p className={cn(
                    "text-xl font-bold",
                    resumo.resultado >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {maskCurrency(resumo.resultado)}
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(
              "glass rounded-lg p-4 border-t-2",
              resumo.percentualResultado >= 0 ? "border-t-green-500" : "border-t-red-500"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  resumo.percentualResultado >= 0 ? "bg-green-500/20" : "bg-red-500/20"
                )}>
                  <Percent className={cn(
                    "w-5 h-5",
                    resumo.percentualResultado >= 0 ? "text-green-400" : "text-red-400"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Percentual</p>
                  <p className={cn(
                    "text-xl font-bold",
                    resumo.percentualResultado >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {resumo.percentualResultado.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Two-column layout for DRE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Despesas - Left */}
            <div className="glass rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border/50 bg-red-500/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-red-400 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Despesas
                  </h3>
                  <span className="text-lg font-bold text-red-400">
                    {maskCurrency(resumo.totalDespesas)}
                  </span>
                </div>
              </div>
              <div className="p-2 max-h-[600px] overflow-y-auto">
                {categoriasDespesas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma despesa no período
                  </p>
                ) : (
                  categoriasDespesas.map(cat => renderCategoriaTree(cat, 0, 'despesas'))
                )}
              </div>
            </div>

            {/* Receitas - Right */}
            <div className="glass rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border/50 bg-green-500/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-green-400 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Receitas
                  </h3>
                  <span className="text-lg font-bold text-green-400">
                    {maskCurrency(resumo.totalReceitas)}
                  </span>
                </div>
              </div>
              <div className="p-2 max-h-[600px] overflow-y-auto">
                {categoriasReceitas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma receita no período
                  </p>
                ) : (
                  categoriasReceitas.map(cat => renderCategoriaTree(cat, 0, 'receitas'))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hidden print component */}
      <div className="hidden">
        <DREReportPrint
          ref={printRef}
          competencia={`${mesLabel} ${ano}`}
          resumo={resumo}
          categoriasDespesas={categoriasDespesas}
          categoriasReceitas={categoriasReceitas}
          tipoRelatorio={tipoRelatorio}
          calcularTotalCategoria={calcularTotalCategoria}
        />
      </div>
    </div>
  );
};

export default FinanceiroDRE;
