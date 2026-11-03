import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarIcon, Filter, Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContaExtrato {
  id: string;
  banco: string;
  descricao: string | null;
}

interface ExtratoContaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: ContaExtrato | null;
}

type PeriodoId =
  | "hoje"
  | "ontem"
  | "3dias"
  | "7dias"
  | "15dias"
  | "30dias"
  | "60dias"
  | "90dias"
  | "mesAtual"
  | "mesAnterior"
  | "outro";

const PERIODOS: { id: PeriodoId; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Dia anterior" },
  { id: "3dias", label: "Últimos 3 dias" },
  { id: "7dias", label: "Últimos 7 dias" },
  { id: "15dias", label: "Últimos 15 dias" },
  { id: "30dias", label: "Últimos 30 dias" },
  { id: "60dias", label: "Últimos 60 dias" },
  { id: "90dias", label: "Últimos 90 dias" },
  { id: "mesAtual", label: "Mês atual" },
  { id: "mesAnterior", label: "Mês anterior" },
  { id: "outro", label: "Outro período" },
];

interface Lancamento {
  id: string;
  data: string | null;
  descricao: string;
  pessoa: string;
  categoria: string;
  tipo: string;
  status: string;
  valor: number; // com sinal: positivo = entrada, negativo = saída
}

type ColunaOrdenacao = "data" | "descricao" | "pessoa" | "categoria" | "tipo" | "status" | "valor";

interface MovimentoBruto {
  id: string;
  data_compra: string | null;
  data_vencimento: string;
  descricao: string | null;
  tipo_movimento: string;
  status: string;
  valor_liquido: number | null;
  valor_bruto: number;
  id_conta: string | null;
  id_conta_destino: string | null;
  pessoa: { nome: string } | null;
  categoria: { categoria: string } | null;
}

// Calcula o intervalo de datas a partir do período pré-definido
export function calcularPeriodo(periodo: PeriodoId, hoje: Date = new Date()): { inicio: Date; fim: Date } {
  switch (periodo) {
    case "hoje":
      return { inicio: hoje, fim: hoje };
    case "ontem": {
      const ontem = subDays(hoje, 1);
      return { inicio: ontem, fim: ontem };
    }
    case "3dias":
      return { inicio: subDays(hoje, 2), fim: hoje };
    case "7dias":
      return { inicio: subDays(hoje, 6), fim: hoje };
    case "15dias":
      return { inicio: subDays(hoje, 14), fim: hoje };
    case "30dias":
      return { inicio: subDays(hoje, 29), fim: hoje };
    case "60dias":
      return { inicio: subDays(hoje, 59), fim: hoje };
    case "90dias":
      return { inicio: subDays(hoje, 89), fim: hoje };
    case "mesAtual":
      return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
    case "mesAnterior": {
      const anterior = subMonths(hoje, 1);
      return { inicio: startOfMonth(anterior), fim: endOfMonth(anterior) };
    }
    default:
      return { inicio: hoje, fim: hoje };
  }
}

// Formata data YYYY-MM-DD para DD/MM/YYYY sem deslocamento de fuso
const formatarData = (data: string | null) => {
  if (!data) return "-";
  const [a, m, d] = data.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

const PAGINA = 1000;

export const ExtratoContaDialog = ({ open, onOpenChange, conta }: ExtratoContaDialogProps) => {
  const { toast } = useToast();
  const [periodo, setPeriodo] = useState<PeriodoId>("hoje");
  const [dataInicial, setDataInicial] = useState<Date | undefined>();
  const [dataFinal, setDataFinal] = useState<Date | undefined>();
  const [carregando, setCarregando] = useState(false);
  const [lancamentos, setLancamentos] = useState<Lancamento[] | null>(null);
  const [intervalo, setIntervalo] = useState<{ inicio: Date; fim: Date } | null>(null);
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaOrdenacao; asc: boolean }>({ coluna: "data", asc: true });
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Extrato - ${conta?.banco ?? ""}`,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    `,
  });

  // Reinicia o estado ao fechar
  const handleOpenChange = (aberto: boolean) => {
    if (!aberto) {
      setLancamentos(null);
      setIntervalo(null);
      setPeriodo("hoje");
      setDataInicial(undefined);
      setDataFinal(undefined);
      setOrdenacao({ coluna: "data", asc: true });
    }
    onOpenChange(aberto);
  };

  const handleFiltrar = async () => {
    if (!conta) return;
    let faixa: { inicio: Date; fim: Date };
    if (periodo === "outro") {
      if (!dataInicial || !dataFinal) {
        toast({ title: "Selecione as datas", description: "Informe a data inicial e a data final.", variant: "destructive" });
        return;
      }
      if (dataInicial > dataFinal) {
        toast({ title: "Período inválido", description: "A data inicial deve ser anterior à data final.", variant: "destructive" });
        return;
      }
      faixa = { inicio: dataInicial, fim: dataFinal };
    } else {
      faixa = calcularPeriodo(periodo);
    }

    const ini = format(faixa.inicio, "yyyy-MM-dd");
    const fim = format(faixa.fim, "yyyy-MM-dd");

    setCarregando(true);
    try {
      const todos: MovimentoBruto[] = [];
      let de = 0;
      // Busca paginada para não perder registros acima do limite padrão
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("vx_fin_movimento")
          .select(
            "id, data_compra, data_vencimento, descricao, tipo_movimento, status, valor_liquido, valor_bruto, id_conta, id_conta_destino, pessoa:vx_pessoa(nome), categoria:vx_fin_categoria(categoria)"
          )
          .or(`id_conta.eq.${conta.id},id_conta_destino.eq.${conta.id}`)
          .or(
            `and(data_compra.gte.${ini},data_compra.lte.${fim}),and(data_compra.is.null,data_vencimento.gte.${ini},data_vencimento.lte.${fim})`
          )
          .order("data_compra", { ascending: true, nullsFirst: false })
          .range(de, de + PAGINA - 1);
        if (error) throw error;
        const lote = (data ?? []) as unknown as MovimentoBruto[];
        todos.push(...lote);
        if (lote.length < PAGINA) break;
        de += PAGINA;
      }

      const lista: Lancamento[] = todos.map((m) => {
        const valorBase = Math.abs(Number(m.valor_liquido ?? m.valor_bruto ?? 0));
        let entrada: boolean;
        if (m.tipo_movimento === "Transferência") {
          entrada = m.id_conta_destino === conta.id;
        } else {
          entrada = m.tipo_movimento === "Receber";
        }
        return {
          id: m.id,
          data: m.data_compra ?? m.data_vencimento,
          descricao: m.descricao || "-",
          pessoa: m.pessoa?.nome || "-",
          categoria: m.categoria?.categoria || "-",
          tipo: m.tipo_movimento,
          status: m.status,
          valor: entrada ? valorBase : -valorBase,
        };
      });

      setLancamentos(lista);
      setIntervalo(faixa);
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Erro ao gerar extrato", description: mensagem, variant: "destructive" });
    } finally {
      setCarregando(false);
    }
  };

  const ordenados = useMemo(() => {
    if (!lancamentos) return [];
    const { coluna, asc } = ordenacao;
    const copia = [...lancamentos];
    copia.sort((a, b) => {
      let r: number;
      if (coluna === "valor") r = a.valor - b.valor;
      else if (coluna === "data") r = (a.data ?? "").localeCompare(b.data ?? "");
      else r = a[coluna].localeCompare(b[coluna], "pt-BR", { sensitivity: "base" });
      return asc ? r : -r;
    });
    return copia;
  }, [lancamentos, ordenacao]);

  const totais = useMemo(() => {
    const entradas = (lancamentos ?? []).filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
    const saidas = (lancamentos ?? []).filter((l) => l.valor < 0).reduce((s, l) => s + l.valor, 0);
    return { entradas, saidas, resultado: entradas + saidas };
  }, [lancamentos]);

  const alternarOrdenacao = (coluna: ColunaOrdenacao) => {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, asc: !atual.asc } : { coluna, asc: true }));
  };

  const IconeOrdem = ({ coluna }: { coluna: ColunaOrdenacao }) => {
    if (ordenacao.coluna !== coluna) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return ordenacao.asc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const Cabecalho = ({ coluna, titulo, className }: { coluna: ColunaOrdenacao; titulo: string; className?: string }) => (
    <TableHead className={cn("text-foreground font-semibold", className)}>
      <button
        type="button"
        onClick={() => alternarOrdenacao(coluna)}
        className={cn("inline-flex items-center gap-1 hover:text-accent transition-colors", className?.includes("text-right") && "flex-row-reverse")}
      >
        {titulo}
        <IconeOrdem coluna={coluna} />
      </button>
    </TableHead>
  );

  const textoPeriodo = intervalo
    ? `${format(intervalo.inicio, "dd/MM/yyyy")} a ${format(intervalo.fim, "dd/MM/yyyy")}`
    : "";

  const corValor = (v: number) => (v >= 0 ? "text-green-500" : "text-red-500");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "glass-strong border-border/50 max-h-[90vh] overflow-y-auto",
          lancamentos ? "max-w-6xl" : "max-w-md"
        )}
      >
        <DialogHeader>
          <DialogTitle>Extrato — {conta?.banco}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
          <div className="space-y-1.5 min-w-[200px]">
            <Label>Período</Label>
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {periodo === "outro" && (
            <>
              <SeletorData label="Data inicial" valor={dataInicial} onChange={setDataInicial} />
              <SeletorData label="Data final" valor={dataFinal} onChange={setDataFinal} />
            </>
          )}

          <div className="flex gap-2">
            <Button className="bg-accent hover:bg-accent/90" onClick={handleFiltrar} disabled={carregando}>
              {carregando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Filter className="w-4 h-4 mr-2" />}
              Filtrar
            </Button>
            {lancamentos && (
              <Button variant="outline" onClick={() => handlePrint()} disabled={lancamentos.length === 0}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            )}
          </div>
        </div>

        {lancamentos && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">Período: <span className="text-foreground">{textoPeriodo}</span></span>
              <span className="text-muted-foreground">Entradas: <span className="text-green-500 font-medium">{maskCurrency(totais.entradas)}</span></span>
              <span className="text-muted-foreground">Saídas: <span className="text-red-500 font-medium">{maskCurrency(totais.saidas)}</span></span>
              <span className="text-muted-foreground">Resultado: <span className={cn("font-medium", corValor(totais.resultado))}>{maskCurrency(totais.resultado)}</span></span>
            </div>

            <div className="rounded-lg border border-border/50 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-10 text-[11px] text-muted-foreground/60 font-normal">#</TableHead>
                    <Cabecalho coluna="data" titulo="Data compra" className="w-[110px]" />
                    <Cabecalho coluna="descricao" titulo="Descrição" />
                    <Cabecalho coluna="pessoa" titulo="Pessoa" />
                    <Cabecalho coluna="categoria" titulo="Categoria" />
                    <Cabecalho coluna="tipo" titulo="Tipo" />
                    <Cabecalho coluna="status" titulo="Status" />
                    <Cabecalho coluna="valor" titulo="Valor" className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum lançamento encontrado no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ordenados.map((l, i) => (
                      <TableRow key={l.id} className="border-border/50">
                        <TableCell className="text-[11px] text-muted-foreground/60">{i + 1}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatarData(l.data)}</TableCell>
                        <TableCell className="max-w-[260px] truncate" title={l.descricao}>{l.descricao}</TableCell>
                        <TableCell className="text-muted-foreground">{l.pessoa}</TableCell>
                        <TableCell className="text-muted-foreground">{l.categoria}</TableCell>
                        <TableCell className="text-muted-foreground">{l.tipo}</TableCell>
                        <TableCell>
                          <Badge variant={l.status === "Pago" ? "default" : "secondary"} className="font-normal">
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-right font-medium whitespace-nowrap", corValor(l.valor))}>
                          {maskCurrency(l.valor)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Conteúdo exclusivo para impressão */}
        <div className="hidden">
          <div ref={printRef} className="p-4 text-black bg-white text-[11px]">
            <h1 className="text-lg font-bold">Extrato bancário</h1>
            <p className="mb-1">
              <strong>Conta:</strong> {conta?.banco}
              {conta?.descricao ? ` — ${conta.descricao}` : ""}
            </p>
            <p className="mb-1"><strong>Período:</strong> {textoPeriodo}</p>
            <p className="mb-3">
              <strong>Emitido em:</strong> {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="py-1 pr-2 font-normal text-[9px]">#</th>
                  <th className="py-1 pr-2">Data compra</th>
                  <th className="py-1 pr-2">Descrição</th>
                  <th className="py-1 pr-2">Pessoa</th>
                  <th className="py-1 pr-2">Categoria</th>
                  <th className="py-1 pr-2">Tipo</th>
                  <th className="py-1 pr-2">Status</th>
                  <th className="py-1 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map((l, i) => (
                  <tr key={l.id} className="border-b border-gray-300">
                    <td className="py-0.5 pr-2 text-[9px]">{i + 1}</td>
                    <td className="py-0.5 pr-2 whitespace-nowrap">{formatarData(l.data)}</td>
                    <td className="py-0.5 pr-2">{l.descricao}</td>
                    <td className="py-0.5 pr-2">{l.pessoa}</td>
                    <td className="py-0.5 pr-2">{l.categoria}</td>
                    <td className="py-0.5 pr-2">{l.tipo}</td>
                    <td className="py-0.5 pr-2">{l.status}</td>
                    <td className="py-0.5 text-right whitespace-nowrap">{maskCurrency(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end gap-6">
              <span><strong>Entradas:</strong> {maskCurrency(totais.entradas)}</span>
              <span><strong>Saídas:</strong> {maskCurrency(totais.saidas)}</span>
              <span><strong>Resultado:</strong> {maskCurrency(totais.resultado)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Seletor de data individual (Outro período)
const SeletorData = ({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !valor && "text-muted-foreground")}>
          <CalendarIcon className="w-4 h-4 mr-2" />
          {valor ? format(valor, "dd/MM/yyyy") : "Selecione"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={valor} onSelect={onChange} initialFocus locale={ptBR} className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  </div>
);
