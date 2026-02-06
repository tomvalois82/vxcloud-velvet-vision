import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Printer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProcuracaoPrint } from "./ProcuracaoPrint";
import { toast } from "sonner";

interface Pessoa {
  id: string;
  nome: string;
  rg?: string | null;
  cpf_cnpj?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  estado?: string | null;
  cep?: string | null;
}

interface Veiculo {
  id: number;
  placa?: string | null;
  renavan?: number | null;
  fabricante?: string | null;
  modelo?: string | null;
  chassi?: string | null;
}

interface ProcuracaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outorganteIdInicial?: string;
  veiculoIdInicial?: number;
}

export function ProcuracaoDialog({ open, onOpenChange, outorganteIdInicial, veiculoIdInicial }: ProcuracaoDialogProps) {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [despachantes, setDespachantes] = useState<Pessoa[]>([]);
  const [veiculosList, setVeiculosList] = useState<Veiculo[]>([]);

  const [outorganteId, setOutorganteId] = useState<string>("");
  const [outorgadoId, setOutorgadoId] = useState<string>("");
  const [veiculosSelecionados, setVeiculosSelecionados] = useState<number[]>([]);
  const [servico, setServico] = useState("TRANSFERÊNCIA DE PROPRIEDADE");

  const [outorganteOpen, setOutorganteOpen] = useState(false);
  const [outorgadoOpen, setOutorgadoOpen] = useState(false);
  const [veiculoOpen, setVeiculoOpen] = useState(false);

  const [showPrint, setShowPrint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Procuração Particular",
    onAfterPrint: () => setShowPrint(false),
  });

  useEffect(() => {
    if (!open) return;
    loadData();
    if (outorganteIdInicial) setOutorganteId(outorganteIdInicial);
    if (veiculoIdInicial) setVeiculosSelecionados([veiculoIdInicial]);
  }, [open, outorganteIdInicial, veiculoIdInicial]);

  async function loadData() {
    const [pessoasRes, despachantesRes, veiculosRes] = await Promise.all([
      supabase.from("vx_pessoa").select("id, nome, rg, cpf_cnpj, logradouro, numero, complemento, bairro, municipio, estado, cep"),
      supabase.from("vx_pessoa").select("id, nome, rg, cpf_cnpj, logradouro, numero, complemento, bairro, municipio, estado, cep").eq("eh_despachante", true),
      supabase.from("estoque").select("id, placa, renavan, fabricante, modelo, chassi"),
    ]);
    if (pessoasRes.data) setPessoas(pessoasRes.data);
    if (despachantesRes.data) setDespachantes(despachantesRes.data);
    if (veiculosRes.data) setVeiculosList(veiculosRes.data);
  }

  function toggleVeiculo(id: number) {
    setVeiculosSelecionados(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  }

  function handleImprimir() {
    if (!outorganteId || !outorgadoId || veiculosSelecionados.length === 0 || !servico.trim()) {
      toast.error("Preencha todos os campos antes de imprimir.");
      return;
    }
    setShowPrint(true);
    setTimeout(() => handlePrint(), 300);
  }

  const outorgante = pessoas.find(p => p.id === outorganteId);
  const outorgado = despachantes.find(p => p.id === outorgadoId);
  const veiculosSel = veiculosList.filter(v => veiculosSelecionados.includes(v.id));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerar Procuração</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Outorgante */}
            <div className="space-y-2">
              <Label>Outorgante (Comprador)</Label>
              <Popover open={outorganteOpen} onOpenChange={setOutorganteOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {outorgante?.nome || "Selecione uma pessoa..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar pessoa..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
                      <CommandGroup>
                        {pessoas.map(p => (
                          <CommandItem key={p.id} value={p.nome} onSelect={() => { setOutorganteId(p.id); setOutorganteOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", outorganteId === p.id ? "opacity-100" : "opacity-0")} />
                            {p.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Outorgado */}
            <div className="space-y-2">
              <Label>Outorgado (Despachante)</Label>
              <Popover open={outorgadoOpen} onOpenChange={setOutorgadoOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {outorgado?.nome || "Selecione um despachante..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar despachante..." />
                    <CommandList>
                      <CommandEmpty>Nenhum despachante encontrado.</CommandEmpty>
                      <CommandGroup>
                        {despachantes.map(p => (
                          <CommandItem key={p.id} value={p.nome} onSelect={() => { setOutorgadoId(p.id); setOutorgadoOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", outorgadoId === p.id ? "opacity-100" : "opacity-0")} />
                            {p.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Veículos */}
            <div className="space-y-2">
              <Label>Veículo(s)</Label>
              <Popover open={veiculoOpen} onOpenChange={setVeiculoOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between min-h-[40px] h-auto">
                    <span className="truncate">{veiculosSelecionados.length > 0 ? `${veiculosSelecionados.length} veículo(s) selecionado(s)` : "Selecione veículo(s)..."}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar veículo..." />
                    <CommandList>
                      <CommandEmpty>Nenhum veículo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {veiculosList.map(v => (
                          <CommandItem key={v.id} value={`${v.placa || ""} ${v.fabricante || ""} ${v.modelo || ""}`} onSelect={() => toggleVeiculo(v.id)}>
                            <Check className={cn("mr-2 h-4 w-4", veiculosSelecionados.includes(v.id) ? "opacity-100" : "opacity-0")} />
                            {v.placa || "S/Placa"} - {v.fabricante} {v.modelo}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {veiculosSel.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {veiculosSel.map(v => (
                    <Badge key={v.id} variant="secondary" className="gap-1">
                      {v.placa || "S/Placa"} - {v.fabricante} {v.modelo}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleVeiculo(v.id)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Serviço */}
            <div className="space-y-2">
              <Label>Serviço</Label>
              <Textarea value={servico} onChange={e => setServico(e.target.value)} placeholder="Ex: TRANSFERÊNCIA DE PROPRIEDADE" rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleImprimir}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden print area */}
      {showPrint && outorgante && outorgado && (
        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
          <ProcuracaoPrint
            ref={printRef}
            outorgante={outorgante}
            outorgado={outorgado}
            veiculos={veiculosSel}
            servico={servico}
          />
        </div>
      )}
    </>
  );
}
