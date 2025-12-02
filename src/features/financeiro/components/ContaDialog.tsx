import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BANCOS_BRASILEIROS = [
  // Bancos Tradicionais
  "Banco do Brasil",
  "Bradesco",
  "Itaú Unibanco",
  "Santander",
  "Caixa Econômica Federal",
  "Banrisul",
  "BRB - Banco de Brasília",
  "Safra",
  "BTG Pactual",
  "Votorantim",
  "Citibank",
  "Sicredi",
  "Sicoob",
  "Banestes",
  "Banco do Nordeste (BNB)",
  "Banco da Amazônia (BASA)",
  "Banpará",
  "BRDE",
  "Banco Pine",
  "ABC Brasil",
  "Banco Alfa",
  "Banco Industrial",
  
  // Fintechs e Bancos Digitais
  "Nubank",
  "Banco Inter",
  "C6 Bank",
  "PagBank (PagSeguro)",
  "Neon",
  "Next",
  "Banco Original",
  "Agibank",
  "Mercado Pago",
  "PicPay",
  "Iti Itaú",
  "Will Bank",
  "99Pay",
  "RecargaPay",
  "Stone",
  "Ame Digital",
  "XP Investimentos",
  "Banco Modal",
  "Daycoval",
  "BS2",
  "Banco Bari",
  "Banco Pan",
  "BMG",
  "Sofisa Direto",
  "Banco Fibra",
  "Banco Topázio",
  "Banco Digimais",
  "Superdigital",
  "N26",
  "Wise",
  "Revolut",
  "PayPal",
  
  // Cooperativas e Outros
  "Unicred",
  "Cresol",
  "Ailos",
  "Banco Cooperativo do Brasil (Bancoob)",
  "CrediSIS",
  
  // Caixa Física / Outros
  "Caixa (Dinheiro)",
  "Cofre",
  "Carteira",
  "Outro"
];

interface Conta {
  id: string;
  banco: string;
  descricao: string | null;
}

interface ContaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: Conta | null;
  onSuccess: () => void;
}

export function ContaDialog({ open, onOpenChange, conta, onSuccess }: ContaDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [banco, setBanco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [bancoError, setBancoError] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);

  useEffect(() => {
    if (open) {
      if (conta) {
        setBanco(conta.banco);
        setDescricao(conta.descricao || "");
      } else {
        setBanco("");
        setDescricao("");
      }
      setBancoError("");
      setOpenCombobox(false);
    }
  }, [open, conta]);

  const checkDuplicate = async (nome: string, excludeId?: string): Promise<boolean> => {
    let query = supabase
      .from("vx_fin_conta")
      .select("id")
      .ilike("banco", nome);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query;
    return (data && data.length > 0) || false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBancoError("");

    if (!banco.trim()) {
      setBancoError("Selecione um banco");
      return;
    }

    setLoading(true);

    try {
      const isDuplicate = await checkDuplicate(banco.trim(), conta?.id);
      if (isDuplicate) {
        setBancoError("Já existe uma conta com este banco");
        setLoading(false);
        return;
      }

      const contaData = {
        banco: banco.trim(),
        descricao: descricao.trim() || null,
      };

      if (conta) {
        const { error } = await supabase
          .from("vx_fin_conta")
          .update(contaData)
          .eq("id", conta.id);

        if (error) throw error;

        toast({
          title: "Conta atualizada",
          description: "A conta foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("vx_fin_conta")
          .insert(contaData);

        if (error) throw error;

        toast({
          title: "Conta criada",
          description: "A conta foi criada com sucesso.",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar a conta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {conta ? "Editar Conta" : "Nova Conta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="banco" className="text-foreground">
              Banco <span className="text-destructive">*</span>
            </Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className={cn(
                    "w-full justify-between bg-background/50 border-border/50 font-normal",
                    !banco && "text-muted-foreground",
                    bancoError && "border-destructive"
                  )}
                  disabled={loading}
                >
                  {banco || "Selecione um banco..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border/50" align="start">
                <Command>
                  <CommandInput placeholder="Buscar banco..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nenhum banco encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-[250px] overflow-auto">
                      {BANCOS_BRASILEIROS.map((bancoOption) => (
                        <CommandItem
                          key={bancoOption}
                          value={bancoOption}
                          onSelect={(currentValue) => {
                            const selectedBank = BANCOS_BRASILEIROS.find(
                              b => b.toLowerCase() === currentValue.toLowerCase()
                            ) || currentValue;
                            setBanco(selectedBank === banco ? "" : selectedBank);
                            setBancoError("");
                            setOpenCombobox(false);
                          }}
                        >
                          {bancoOption}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              banco.toLowerCase() === bancoOption.toLowerCase() ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {bancoError && (
              <p className="text-sm text-destructive">{bancoError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-foreground">
              Descrição
            </Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição opcional da conta..."
              className="bg-background/50 border-border/50"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-accent hover:bg-accent/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
