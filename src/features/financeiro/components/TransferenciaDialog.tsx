import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Conta {
  id: string;
  banco: string;
  descricao: string | null;
  saldo: number;
}

interface TransferenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Mask para moeda
const maskCurrency = (value: string | number): string => {
  const numericValue = typeof value === 'string' 
    ? value.replace(/\D/g, '') 
    : Math.round(value * 100).toString();
  
  if (!numericValue || numericValue === '0') return '';
  
  const number = parseInt(numericValue, 10) / 100;
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const parseCurrency = (value: string): number => {
  const numericString = value.replace(/\D/g, '');
  return parseInt(numericString || '0', 10) / 100;
};

export function TransferenciaDialog({ open, onOpenChange, onSuccess }: TransferenciaDialogProps) {
  const [saving, setSaving] = useState(false);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loadingContas, setLoadingContas] = useState(false);
  
  const [contaOrigem, setContaOrigem] = useState("");
  const [contaDestino, setContaDestino] = useState("");
  const [valor, setValor] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (open) {
      fetchContas();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setContaOrigem("");
    setContaDestino("");
    setValor("");
    setObservacao("");
  };

  const fetchContas = async () => {
    setLoadingContas(true);
    try {
      const { data, error } = await supabase
        .from("vx_fin_conta")
        .select("id, banco, descricao, saldo")
        .order("banco");

      if (error) throw error;
      setContas(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar contas: " + error.message);
    } finally {
      setLoadingContas(false);
    }
  };

  const getContaDisplayName = (conta: Conta) => {
    return conta.descricao ? `${conta.banco} - ${conta.descricao}` : conta.banco;
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCurrency(e.target.value);
    setValor(masked);
  };

  const handleSubmit = async () => {
    if (!contaOrigem || !contaDestino) {
      toast.error("Selecione as contas de origem e destino");
      return;
    }

    if (contaOrigem === contaDestino) {
      toast.error("As contas de origem e destino devem ser diferentes");
      return;
    }

    const valorNumerico = parseCurrency(valor);
    if (valorNumerico <= 0) {
      toast.error("Informe um valor válido para a transferência");
      return;
    }

    setSaving(true);
    try {
      // Buscar dados do usuário e empresa
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { data: usuario } = await supabase
        .from("usuario")
        .select("config")
        .eq("uid", userData.user.id)
        .maybeSingle();

      const { data: empresa } = await supabase
        .from("empresa")
        .select("id")
        .eq("id_config", usuario?.config)
        .maybeSingle();

      if (!empresa) throw new Error("Empresa não encontrada");

      // Buscar categoria de transferência ou criar uma genérica
      let { data: categoriaTransf } = await supabase
        .from("vx_fin_categoria")
        .select("id")
        .ilike("categoria", "%transferência%")
        .maybeSingle();

      // Se não existir categoria de transferência, usar a primeira disponível
      if (!categoriaTransf) {
        const { data: primeiraCategoria } = await supabase
          .from("vx_fin_categoria")
          .select("id")
          .limit(1)
          .single();
        categoriaTransf = primeiraCategoria;
      }

      if (!categoriaTransf) throw new Error("Nenhuma categoria encontrada");

      // Buscar saldos atuais das contas
      const { data: contaOrigemData } = await supabase
        .from("vx_fin_conta")
        .select("saldo")
        .eq("id", contaOrigem)
        .single();

      const { data: contaDestinoData } = await supabase
        .from("vx_fin_conta")
        .select("saldo")
        .eq("id", contaDestino)
        .single();

      if (!contaOrigemData || !contaDestinoData) {
        throw new Error("Erro ao buscar saldos das contas");
      }

      const contaOrigemNome = contas.find(c => c.id === contaOrigem);
      const contaDestinoNome = contas.find(c => c.id === contaDestino);

      // Criar movimento de transferência (saída da conta origem)
      const { error: errorMovimento } = await supabase
        .from("vx_fin_movimento")
        .insert({
          descricao: `Transferência para ${getContaDisplayName(contaDestinoNome!)}`,
          valor_bruto: valorNumerico,
          valor_liquido: valorNumerico,
          data_vencimento: new Date().toISOString().split('T')[0],
          data_pagamento: new Date().toISOString().split('T')[0],
          id_conta: contaOrigem,
          id_conta_destino: contaDestino,
          id_categoria: categoriaTransf.id,
          id_empresa: empresa.id,
          tipo_movimento: "Transferência",
          status: "Pago",
          observacoes: observacao || null,
        });

      if (errorMovimento) throw errorMovimento;

      // Atualizar saldo da conta origem (debitar)
      const novoSaldoOrigem = Number(contaOrigemData.saldo) - valorNumerico;
      const { error: errorOrigem } = await supabase
        .from("vx_fin_conta")
        .update({ saldo: novoSaldoOrigem })
        .eq("id", contaOrigem);

      if (errorOrigem) throw errorOrigem;

      // Atualizar saldo da conta destino (creditar)
      const novoSaldoDestino = Number(contaDestinoData.saldo) + valorNumerico;
      const { error: errorDestino } = await supabase
        .from("vx_fin_conta")
        .update({ saldo: novoSaldoDestino })
        .eq("id", contaDestino);

      if (errorDestino) throw errorDestino;

      toast.success("Transferência realizada com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao realizar transferência: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const contaOrigemSelecionada = contas.find(c => c.id === contaOrigem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Transferência</DialogTitle>
        </DialogHeader>

        {loadingContas ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Conta Origem *</Label>
              <Select value={contaOrigem} onValueChange={setContaOrigem}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta de origem" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {getContaDisplayName(conta)} ({maskCurrency(conta.saldo)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {contaOrigemSelecionada && (
                <p className="text-xs text-muted-foreground">
                  Saldo atual: {maskCurrency(contaOrigemSelecionada.saldo)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Conta Destino *</Label>
              <Select value={contaDestino} onValueChange={setContaDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {contas
                    .filter(c => c.id !== contaOrigem)
                    .map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {getContaDisplayName(conta)} ({maskCurrency(conta.saldo)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                value={valor}
                onChange={handleValorChange}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observação opcional..."
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || loadingContas}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
