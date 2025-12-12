import { useState, useEffect } from "react";
import { format, lastDayOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, AlertCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { maskCurrency } from "@/features/estoque/utils/masks";

interface Cartao {
  id: string;
  descricao: string;
  final: string;
  bandeira: string;
  dia_fechamento: number;
  dia_vencimento: number;
  id_empresa: string;
}

interface LancamentoFatura {
  id: string;
  descricao: string;
  valor_bruto: number;
  data_compra: string | null;
  competencia: string | null;
}

interface GerarFaturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartaoId?: string | null;
  onSuccess?: () => void;
}

export function GerarFaturaDialog({
  open,
  onOpenChange,
  cartaoId: cartaoIdProp,
  onSuccess,
}: GerarFaturaDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [selectedCartaoId, setSelectedCartaoId] = useState<string>("");
  const [selectedCompetencia, setSelectedCompetencia] = useState<string>("");
  const [lancamentos, setLancamentos] = useState<LancamentoFatura[]>([]);
  const [loadingLancamentos, setLoadingLancamentos] = useState(false);
  const [faturaInfo, setFaturaInfo] = useState<{
    competencia: string;
    dataVencimento: string;
    total: number;
  } | null>(null);

  // Gerar opções de competência (últimos 6 meses + próximos 3)
  const competenciaOptions = (() => {
    const options: string[] = [];
    const hoje = new Date();
    for (let i = -6; i <= 3; i++) {
      const date = addMonths(hoje, i);
      const comp = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
      options.push(comp);
    }
    return options;
  })();

  // Fetch cartões when dialog opens
  useEffect(() => {
    if (open) {
      fetchCartoes();
      if (cartaoIdProp) {
        setSelectedCartaoId(cartaoIdProp);
      }
    } else {
      // Reset state when closing
      setSelectedCartaoId("");
      setSelectedCompetencia("");
      setLancamentos([]);
      setFaturaInfo(null);
    }
  }, [open, cartaoIdProp]);

  // Set default competencia when cartao is selected
  useEffect(() => {
    if (selectedCartaoId && !selectedCompetencia) {
      const cartao = cartoes.find((c) => c.id === selectedCartaoId);
      if (cartao) {
        const hoje = new Date();
        const diaAtual = hoje.getDate();
        let mesFatura = hoje.getMonth();
        let anoFatura = hoje.getFullYear();

        if (diaAtual > cartao.dia_fechamento) {
          mesFatura += 1;
          if (mesFatura > 11) {
            mesFatura = 0;
            anoFatura += 1;
          }
        }
        const competenciaDefault = `${String(mesFatura + 1).padStart(2, "0")}/${anoFatura}`;
        setSelectedCompetencia(competenciaDefault);
      }
    }
  }, [selectedCartaoId, cartoes]);

  // Fetch lancamentos when cartao or competencia changes
  useEffect(() => {
    if (selectedCartaoId && selectedCompetencia) {
      fetchLancamentosCartao();
    } else {
      setLancamentos([]);
      setFaturaInfo(null);
    }
  }, [selectedCartaoId, selectedCompetencia]);

  const fetchCartoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vx_fin_cartao")
        .select("id, descricao, final, bandeira, dia_fechamento, dia_vencimento, id_empresa")
        .eq("ativo", true)
        .order("descricao");

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

  const fetchLancamentosCartao = async () => {
    if (!selectedCartaoId || !selectedCompetencia) return;

    setLoadingLancamentos(true);
    try {
      const cartao = cartoes.find((c) => c.id === selectedCartaoId);
      if (!cartao) return;

      // Usar a competência selecionada
      const [mesStr, anoStr] = selectedCompetencia.split("/");
      const mesFatura = parseInt(mesStr, 10) - 1; // 0-indexed
      const anoFatura = parseInt(anoStr, 10);

      // Calcular data de vencimento
      const ultimoDiaMes = lastDayOfMonth(new Date(anoFatura, mesFatura, 1)).getDate();
      const diaVencimentoReal = Math.min(cartao.dia_vencimento, ultimoDiaMes);
      const dataVencimento = new Date(anoFatura, mesFatura, diaVencimentoReal);

      // Buscar lançamentos pendentes deste cartão para esta competência
      const { data, error } = await supabase
        .from("vx_fin_movimento")
        .select("id, descricao, valor_bruto, data_compra, competencia")
        .eq("id_cartao", selectedCartaoId)
        .eq("tipo_movimento", "Pagar")
        .eq("status", "Pendente")
        .eq("competencia", selectedCompetencia)
        .order("data_compra", { ascending: true });

      if (error) throw error;

      const lancamentosData = data || [];
      const total = lancamentosData.reduce((sum, l) => sum + Number(l.valor_bruto), 0);

      setLancamentos(lancamentosData);
      setFaturaInfo({
        competencia: selectedCompetencia,
        dataVencimento: format(dataVencimento, "yyyy-MM-dd"),
        total,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar lançamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingLancamentos(false);
    }
  };

  const handleGerarFatura = async () => {
    if (!selectedCartaoId || !faturaInfo || lancamentos.length === 0) return;

    const cartao = cartoes.find((c) => c.id === selectedCartaoId);
    if (!cartao) return;

    setGerando(true);
    try {
      // Criar o movimento da fatura consolidada
      const descricaoFatura = `Fatura ${cartao.descricao} - ${faturaInfo.competencia}`;

      const { data: novaFatura, error: insertError } = await supabase
        .from("vx_fin_movimento")
        .insert({
          tipo_movimento: "Pagar",
          descricao: descricaoFatura,
          valor_bruto: faturaInfo.total,
          valor_liquido: faturaInfo.total,
          data_vencimento: faturaInfo.dataVencimento,
          data_compra: format(new Date(), "yyyy-MM-dd"),
          id_empresa: cartao.id_empresa,
          id_cartao: selectedCartaoId,
          competencia: faturaInfo.competencia,
          status: "Pendente",
          observacoes: `Fatura gerada automaticamente com ${lancamentos.length} lançamento(s)`,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Fatura gerada com sucesso",
        description: `Fatura de ${maskCurrency(faturaInfo.total)} criada para ${faturaInfo.competencia}.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao gerar fatura",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGerando(false);
    }
  };

  const selectedCartao = cartoes.find((c) => c.id === selectedCartaoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/50 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            Gerar Fatura de Cartão
          </DialogTitle>
          <DialogDescription>
            Gere uma fatura consolidada com todos os lançamentos do cartão para o próximo vencimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : cartoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum cartão ativo cadastrado.</p>
            </div>
          ) : (
            <>
              {/* Seleção de cartão (se não foi passado como prop) */}
              {!cartaoIdProp && (
                <div className="space-y-2">
                  <Label>Cartão de Crédito</Label>
                  <Select value={selectedCartaoId} onValueChange={setSelectedCartaoId}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="Selecione um cartão..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cartoes.map((cartao) => (
                        <SelectItem key={cartao.id} value={cartao.id}>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-accent" />
                            {cartao.descricao} - •••• {cartao.final}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Info do cartão selecionado */}
              {selectedCartao && (
                <div className="bg-accent/10 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-accent" />
                    <span className="font-medium">{selectedCartao.descricao}</span>
                    <span className="text-muted-foreground">•••• {selectedCartao.final}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Fechamento: dia {selectedCartao.dia_fechamento} | Vencimento: dia {selectedCartao.dia_vencimento}
                  </div>
                </div>
              )}

              {/* Seleção de competência */}
              {selectedCartaoId && (
                <div className="space-y-2">
                  <Label>Competência da Fatura</Label>
                  <Select value={selectedCompetencia} onValueChange={setSelectedCompetencia}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="Selecione a competência..." />
                    </SelectTrigger>
                    <SelectContent>
                      {competenciaOptions.map((comp) => (
                        <SelectItem key={comp} value={comp}>
                          {comp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Informações da fatura */}
              {loadingLancamentos ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando lançamentos...</span>
                </div>
              ) : faturaInfo && (
                <div className="space-y-3">
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Vencimento</p>
                    <p className="font-semibold">
                      {format(new Date(faturaInfo.dataVencimento + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  {lancamentos.length === 0 ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                      <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Não há lançamentos pendentes para esta competência.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm">Lançamentos ({lancamentos.length})</Label>
                        <div className="max-h-48 overflow-y-auto space-y-1 bg-background/30 rounded-lg p-2">
                          {lancamentos.map((lancamento) => (
                            <div
                              key={lancamento.id}
                              className="flex items-center justify-between text-sm py-1 px-2 hover:bg-background/50 rounded"
                            >
                              <span className="truncate flex-1 mr-2">{lancamento.descricao}</span>
                              <span className="font-mono text-right whitespace-nowrap">
                                {maskCurrency(lancamento.valor_bruto)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-accent/20 rounded-lg p-4 flex items-center justify-between">
                        <span className="font-medium">Total da Fatura</span>
                        <span className="text-xl font-bold text-accent">
                          {maskCurrency(faturaInfo.total)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={gerando}>
            Cancelar
          </Button>
          <Button
            onClick={handleGerarFatura}
            disabled={gerando || !selectedCartaoId || !faturaInfo || lancamentos.length === 0}
            className="bg-accent hover:bg-accent/90"
          >
            {gerando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Gerar Fatura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
