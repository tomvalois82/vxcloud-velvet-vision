import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Download, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { CategoriaAutocomplete } from "./CategoriaAutocomplete";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { findBestPessoaMatch, parseOfx } from "../utils/ofxParser";
import { maskCurrency, unmaskCurrency } from "@/features/estoque/utils/masks";
import { PessoaDialog } from "@/features/pessoas/components/PessoaDialog";

interface MovimentoExistente {
  id: string;
  data_pagamento: string | null;
  data_vencimento: string;
  valor_liquido: number;
  descricao: string;
  id_pessoa: string | null;
  id_conta: string;
}

interface DuplicatePair {
  linha: LinhaImportacao;
  existentes: MovimentoExistente[];
  selecionado: boolean;
}

const formatDateBR = (d: string | null | undefined) => {
  if (!d) return "";
  const only = d.slice(0, 10);
  const [y, m, day] = only.split("-");
  if (!y || !m || !day) return only;
  return `${day}/${m}/${y}`;
};

interface Conta {
  id: string;
  banco: string;
}

interface Pessoa {
  id: string;
  nome: string;
  id_categoria: string | null;
  id_forma_pagamento: string | null;
}

interface Categoria {
  id: string;
  categoria: string;
  operacao: string;
  tipo_conta: string | null;
  ativo: boolean;
  id_categoria_pai: string | null;
}


interface FormaPagamento {
  id: string;
  descricao: string;
}

interface Veiculo {
  id: number;
  fabricante: string | null;
  modelo: string | null;
  placa: string | null;
  ano: string | null;
}

interface LinhaImportacao {
  uid: string;
  tipo: "Pagar" | "Receber";
  data: string;
  descricao: string;
  nome: string;
  id_pessoa: string | null;
  valor: number;
  id_categoria: string | null;
  id_forma_pagamento: string | null;
  id_estoque: number | null;
}

interface OfxImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: Conta | null;
  onSuccess?: () => void;
}

export function OfxImportDialog({
  open,
  onOpenChange,
  conta,
  onSuccess,
}: OfxImportDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [linhas, setLinhas] = useState<LinhaImportacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);

  // Estado para o diálogo de adicionar/editar pessoa a partir de uma linha
  const [pessoaDialogOpen, setPessoaDialogOpen] = useState(false);
  const [pessoaDialogData, setPessoaDialogData] = useState<any>(null);
  const [pessoaDialogMode, setPessoaDialogMode] = useState<"create" | "edit">("create");
  const [linhaUidPendente, setLinhaUidPendente] = useState<string | null>(null);
  const [editingPessoaId, setEditingPessoaId] = useState<string | null>(null);

  const fetchPessoas = async (): Promise<Pessoa[]> => {
    const { data } = await supabase
      .from("vx_pessoa")
      .select("id, nome, id_categoria, id_forma_pagamento")
      .order("nome");
    const lista = (data || []) as Pessoa[];
    setPessoas(lista);
    return lista;
  };

  useEffect(() => {
    if (!open) {
      setFile(null);
      setLinhas([]);
      return;
    }
    (async () => {
      const [, categoriasRes, formasRes, veiculosRes] = await Promise.all([
        fetchPessoas(),
        supabase
          .from("vx_fin_categoria")
          .select("id, categoria, operacao, tipo_conta, ativo, id_categoria_pai")
          .eq("ativo", true)
          .order("categoria"),
        supabase
          .from("vx_forma_pagamento")
          .select("id, descricao")
          .eq("ativa", true)
          .order("descricao"),
        supabase
          .from("estoque")
          .select("id, fabricante, modelo, placa, ano")
          .order("fabricante"),
      ]);
      setCategorias((categoriasRes.data || []) as Categoria[]);
      setFormasPagamento((formasRes.data || []) as FormaPagamento[]);
      setVeiculos((veiculosRes.data || []) as Veiculo[]);
    })();
  }, [open]);

  // Abre o diálogo em modo "criar", pré-preenchendo o nome com o texto da linha
  const handleAbrirCriarPessoa = (uidLinha: string, nomeInicial: string) => {
    setLinhaUidPendente(uidLinha);
    setEditingPessoaId(null);
    setPessoaDialogMode("create");
    setPessoaDialogData({ nome: nomeInicial || "" });
    setPessoaDialogOpen(true);
  };

  // Abre o diálogo em modo "editar", carregando os dados completos da pessoa
  const handleAbrirEditarPessoa = async (idPessoa: string) => {
    const { data, error } = await supabase
      .from("vx_pessoa")
      .select("*")
      .eq("id", idPessoa)
      .maybeSingle();
    if (error || !data) {
      toast({
        title: "Erro ao carregar pessoa",
        description: error?.message ?? "Pessoa não encontrada",
        variant: "destructive",
      });
      return;
    }
    setLinhaUidPendente(null);
    setEditingPessoaId(idPessoa);
    setPessoaDialogMode("edit");
    setPessoaDialogData(data);
    setPessoaDialogOpen(true);
  };

  // Após criar/editar, atualiza a lista e propaga mudanças para as linhas
  const handlePessoaSalva = async () => {
    const idsAntigos = new Set(pessoas.map((p) => p.id));
    const novaLista = await fetchPessoas();
    if (pessoaDialogMode === "create") {
      const nova = novaLista.find((p) => !idsAntigos.has(p.id));
      if (nova && linhaUidPendente) {
        setLinhas((prev) =>
          prev.map((l) =>
            l.uid === linhaUidPendente
              ? {
                  ...l,
                  id_pessoa: nova.id,
                  id_categoria: nova.id_categoria ?? l.id_categoria,
                  id_forma_pagamento: nova.id_forma_pagamento ?? l.id_forma_pagamento,
                }
              : l,
          ),
        );
      }
    } else if (pessoaDialogMode === "edit" && editingPessoaId) {
      const atualizada = novaLista.find((p) => p.id === editingPessoaId);
      if (atualizada) {
        // Propaga categoria/forma de pagamento padrão para todas as linhas dessa pessoa
        setLinhas((prev) =>
          prev.map((l) =>
            l.id_pessoa === editingPessoaId
              ? {
                  ...l,
                  id_categoria: atualizada.id_categoria ?? l.id_categoria,
                  id_forma_pagamento:
                    atualizada.id_forma_pagamento ?? l.id_forma_pagamento,
                }
              : l,
          ),
        );
      }
    }
    setLinhaUidPendente(null);
    setEditingPessoaId(null);
  };


  const categoriasFiltradas = useMemo(
    () =>
      categorias.filter(
        (c) => (c.tipo_conta ?? "Analítica") === "Analítica",
      ),
    [categorias],
  );

  const handleParseFile = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const txs = parseOfx(text);
      if (txs.length === 0) {
        toast({
          title: "Nenhuma transação encontrada",
          description: "O arquivo OFX não contém transações válidas.",
          variant: "destructive",
        });
        return;
      }
      const novasLinhas: LinhaImportacao[] = txs.map((tx, idx) => {
        const tipo: "Pagar" | "Receber" =
          tx.trnType === "CREDIT" || tx.trnAmt > 0 ? "Receber" : "Pagar";
        const match = findBestPessoaMatch(tx.name, pessoas);
        return {
          uid: `${tx.fitId || idx}-${idx}`,
          tipo,
          data: tx.dtPosted,
          descricao: tx.memo,
          nome: tx.name,
          id_pessoa: match?.id ?? null,
          valor: Math.abs(tx.trnAmt),
          id_categoria: match?.id_categoria ?? null,
          id_forma_pagamento: match?.id_forma_pagamento ?? null,
          id_estoque: null,
        };
      });
      setLinhas(novasLinhas);
    } catch (error) {
      toast({
        title: "Erro ao ler arquivo",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLinha = (uid: string, patch: Partial<LinhaImportacao>) => {
    setLinhas((prev) =>
      prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)),
    );
  };

  const removeLinha = (uid: string) => {
    setLinhas((prev) => prev.filter((l) => l.uid !== uid));
  };

  // Estado para diálogo de duplicidade e sucesso
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [duplicatePairs, setDuplicatePairs] = useState<DuplicatePair[]>([]);
  const [duplicateBaseImported, setDuplicateBaseImported] = useState(0);
  const [closeAfterDuplicates, setCloseAfterDuplicates] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [shouldCloseOnSuccess, setShouldCloseOnSuccess] = useState(false);

  const buscarDuplicados = async (
    linhasParaImportar: LinhaImportacao[],
  ): Promise<Map<string, MovimentoExistente[]>> => {
    const result = new Map<string, MovimentoExistente[]>();
    if (!conta || linhasParaImportar.length === 0) return result;
    const datas = [...new Set(linhasParaImportar.map((l) => l.data))];
    const valores = [...new Set(linhasParaImportar.map((l) => Number(l.valor)))];
    const { data, error } = await supabase
      .from("vx_fin_movimento")
      .select("id, data_pagamento, data_vencimento, valor_liquido, descricao, id_pessoa, id_conta")
      .eq("id_conta", conta.id)
      .in("data_pagamento", datas)
      .in("valor_liquido", valores);
    if (error) return result;
    const existentes = (data || []) as MovimentoExistente[];
    for (const l of linhasParaImportar) {
      const matches = existentes.filter(
        (e) =>
          e.id_conta === conta!.id &&
          e.data_pagamento === l.data &&
          Number(e.valor_liquido) === Number(l.valor),
      );
      if (matches.length > 0) result.set(l.uid, matches);
    }
    return result;
  };

  const insertLinhas = async (
    linhasParaImportar: LinhaImportacao[],
  ): Promise<boolean> => {
    if (!conta) return false;
    if (linhasParaImportar.length === 0) return true;
    const semCategoria = linhasParaImportar.some((l) => !l.id_categoria);
    if (semCategoria) {
      toast({
        title: "Categoria obrigatória",
        description: "Selecione uma categoria para todas as movimentações.",
        variant: "destructive",
      });
      return false;
    }

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

      const payload = linhasParaImportar.map((l) => ({
        id_empresa: empresaData.id,
        id_conta: conta.id,
        tipo_movimento: l.tipo,
        descricao: l.descricao || l.nome || "Importado via OFX",
        valor_bruto: l.valor,
        valor_liquido: l.valor,
        data_vencimento: l.data,
        data_pagamento: l.data,
        status: "Pago",
        id_categoria: l.id_categoria,
        id_forma_pagamento: l.id_forma_pagamento,
        id_pessoa: l.id_pessoa,
        id_estoque: l.id_estoque,
      }));

      const { error } = await supabase.from("vx_fin_movimento").insert(payload);
      if (error) throw error;
      onSuccess?.();
      return true;
    } catch (error) {
      toast({
        title: "Erro ao importar",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
      return false;
    }
  };

  const processarImportacao = async (
    linhasParaImportar: LinhaImportacao[],
    fecharAposFinal: boolean,
  ) => {
    if (!conta) return;
    if (linhasParaImportar.length === 0) {
      toast({
        title: "Nada para importar",
        description: "Carregue um arquivo OFX primeiro.",
        variant: "destructive",
      });
      return;
    }
    const semCategoria = linhasParaImportar.some((l) => !l.id_categoria);
    if (semCategoria) {
      toast({
        title: "Categoria obrigatória",
        description: "Selecione uma categoria para todas as movimentações.",
        variant: "destructive",
      });
      return;
    }

    const dupMap = await buscarDuplicados(linhasParaImportar);
    const naoDuplicados = linhasParaImportar.filter((l) => !dupMap.has(l.uid));
    const duplicados = linhasParaImportar.filter((l) => dupMap.has(l.uid));

    let importadosOk = 0;
    if (naoDuplicados.length > 0) {
      const ok = await insertLinhas(naoDuplicados);
      if (!ok) return;
      importadosOk = naoDuplicados.length;
      const uidsImportados = new Set(naoDuplicados.map((l) => l.uid));
      setLinhas((prev) => prev.filter((l) => !uidsImportados.has(l.uid)));
    }

    if (duplicados.length === 0) {
      setSuccessCount(importadosOk);
      setShouldCloseOnSuccess(fecharAposFinal);
      setSuccessOpen(true);
      return;
    }

    setDuplicatePairs(
      duplicados.map((linha) => ({
        linha,
        existentes: dupMap.get(linha.uid) || [],
        selecionado: false,
      })),
    );
    setDuplicateBaseImported(importadosOk);
    setCloseAfterDuplicates(fecharAposFinal);
    setDuplicatesOpen(true);
  };

  const handleImport = async () => {
    setImporting(true);
    await processarImportacao(linhas, true);
    setImporting(false);
  };

  const handleImportSingle = async (uid: string) => {
    const linha = linhas.find((l) => l.uid === uid);
    if (!linha) return;
    await processarImportacao([linha], false);
  };

  const handleConfirmarDuplicados = async () => {
    const selecionadas = duplicatePairs
      .filter((p) => p.selecionado)
      .map((p) => p.linha);
    let totalImportado = duplicateBaseImported;
    if (selecionadas.length > 0) {
      const ok = await insertLinhas(selecionadas);
      if (!ok) return;
      totalImportado += selecionadas.length;
      const uids = new Set(selecionadas.map((l) => l.uid));
      setLinhas((prev) => prev.filter((l) => !uids.has(l.uid)));
    }
    setDuplicatesOpen(false);
    setDuplicatePairs([]);
    setSuccessCount(totalImportado);
    setShouldCloseOnSuccess(closeAfterDuplicates);
    setSuccessOpen(true);
  };

  const toggleDuplicado = (uid: string, value: boolean) => {
    setDuplicatePairs((prev) =>
      prev.map((p) => (p.linha.uid === uid ? { ...p, selecionado: value } : p)),
    );
  };

  const toggleTodosDuplicados = (value: boolean) => {
    setDuplicatePairs((prev) => prev.map((p) => ({ ...p, selecionado: value })));
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    if (shouldCloseOnSuccess) onOpenChange(false);
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Importar Extrato para Conta {conta?.banco ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-end gap-3 border-b border-border/50 pb-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">
              Arquivo .ofx
            </label>
            <Input
              type="file"
              accept=".ofx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            onClick={handleParseFile}
            disabled={!file || loading}
            className="bg-accent hover:bg-accent/90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Enviar arquivo
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {linhas.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Envie um arquivo .ofx para visualizar as transações.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Tipo</TableHead>
                  <TableHead className="w-[140px]">Data</TableHead>
                  <TableHead className="min-w-[200px]">Descrição</TableHead>
                  <TableHead className="min-w-[130px]">Nome</TableHead>
                  <TableHead className="min-w-[160px] w-[160px]">Valor</TableHead>
                  <TableHead className="min-w-[180px]">Categoria</TableHead>
                  <TableHead className="min-w-[160px]">Forma Pgto</TableHead>
                  <TableHead className="min-w-[200px]">Veículo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <LinhaRow
                    key={l.uid}
                    linha={l}
                    pessoas={pessoas}
                    categorias={categorias}
                    formasPagamento={formasPagamento}
                    veiculos={veiculos}
                    onChange={(patch) => updateLinha(l.uid, patch)}
                    onRemove={() => removeLinha(l.uid)}
                    onAddPessoa={() => handleAbrirCriarPessoa(l.uid, l.nome)}
                    onEditPessoa={() => l.id_pessoa && handleAbrirEditarPessoa(l.id_pessoa)}
                    onImportSingle={() => handleImportSingle(l.uid)}
                  />
                ))}
              </TableBody>

            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || linhas.length === 0}
            className="bg-accent hover:bg-accent/90"
          >
            {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>

      <PessoaDialog
        open={pessoaDialogOpen}
        onOpenChange={(o) => {
          setPessoaDialogOpen(o);
          if (!o) {
            setLinhaUidPendente(null);
            setEditingPessoaId(null);
            setPessoaDialogData(null);
          }
        }}
        pessoa={pessoaDialogData}
        onSuccess={handlePessoaSalva}
      />

      <Dialog open={successOpen} onOpenChange={(o) => (o ? setSuccessOpen(true) : handleSuccessClose())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importação concluída</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm">
            {successCount} {successCount === 1 ? "Registro importado." : "Registros importados."}
          </p>
          <DialogFooter>
            <Button onClick={handleSuccessClose} className="bg-accent hover:bg-accent/90">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicatesOpen} onOpenChange={setDuplicatesOpen}>
        <DialogContent className="max-w-[90vw] w-[90vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Registros semelhantes encontrados</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Existem alguns registros semelhantes no banco de dados, confira e selecione os itens que deseja importar mesmo assim.
          </p>
          <div className="flex-1 overflow-auto border border-border/50 rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        duplicatePairs.length > 0 &&
                        duplicatePairs.every((p) => p.selecionado)
                      }
                      onCheckedChange={(v) => toggleTodosDuplicados(!!v)}
                    />
                  </TableHead>
                  <TableHead>A ser importado</TableHead>
                  <TableHead>Existente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duplicatePairs.map((p) => {
                  const pessoaLinha =
                    pessoas.find((x) => x.id === p.linha.id_pessoa)?.nome ??
                    p.linha.nome ??
                    "";
                  return (
                    <TableRow key={p.linha.uid}>
                      <TableCell>
                        <Checkbox
                          checked={p.selecionado}
                          onCheckedChange={(v) => toggleDuplicado(p.linha.uid, !!v)}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-sm">
                          {formatDateBR(p.linha.data)} - {p.linha.descricao || p.linha.nome || "-"} ({pessoaLinha || "-"}) - {maskCurrency(p.linha.valor)}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          {p.existentes.map((e) => {
                            const pessoaExist = pessoas.find((x) => x.id === e.id_pessoa)?.nome ?? "-";
                            return (
                              <div key={e.id} className="text-sm">
                                {formatDateBR(e.data_pagamento ?? e.data_vencimento)} - {e.descricao || "-"} ({pessoaExist}) - {maskCurrency(Number(e.valor_liquido))}
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicatesOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarDuplicados} className="bg-accent hover:bg-accent/90">
              Importar selecionados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

interface LinhaRowProps {
  linha: LinhaImportacao;
  pessoas: Pessoa[];
  categorias: Categoria[];
  formasPagamento: FormaPagamento[];
  veiculos: Veiculo[];
  onChange: (patch: Partial<LinhaImportacao>) => void;
  onRemove: () => void;
  onAddPessoa: () => void;
  onEditPessoa: () => void;
  onImportSingle: () => void;
}

function LinhaRow({
  linha,
  pessoas,
  categorias,
  formasPagamento,
  veiculos,
  onChange,
  onRemove,
  onAddPessoa,
  onEditPessoa,
  onImportSingle,
}: LinhaRowProps) {

  const handlePessoaChange = (id: string | null) => {
    const pessoa = pessoas.find((p) => p.id === id);
    onChange({
      id_pessoa: id,
      id_categoria: pessoa?.id_categoria ?? linha.id_categoria,
      id_forma_pagamento: pessoa?.id_forma_pagamento ?? linha.id_forma_pagamento,
    });
  };

  return (
    <TableRow>
      <TableCell>
        <Select
          value={linha.tipo}
          onValueChange={(v) => onChange({ tipo: v as "Pagar" | "Receber" })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pagar">Pagamento</SelectItem>
            <SelectItem value="Receber">Recebimento</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="date"
          value={linha.data}
          onChange={(e) => onChange({ data: e.target.value })}
          className="h-9"
        />
      </TableCell>
      <TableCell>
        <Input
          value={linha.descricao}
          onChange={(e) => onChange({ descricao: e.target.value })}
          className="h-9"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <PessoaSelect
            pessoas={pessoas}
            value={linha.id_pessoa}
            fallbackLabel={linha.nome}
            onChange={(id) => handlePessoaChange(id)}
          />
          {linha.id_pessoa ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              title="Editar pessoa"
              onClick={onEditPessoa}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              title="Adicionar nova pessoa"
              onClick={onAddPessoa}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell className="min-w-[160px] w-[160px]">
        <Input
          type="text"
          inputMode="decimal"
          value={maskCurrency(linha.valor)}
          onChange={(e) => onChange({ valor: unmaskCurrency(e.target.value) })}
          className="h-9 text-right w-full min-w-[140px]"
        />
      </TableCell>
      <TableCell>
        <CategoriaAutocomplete
          categorias={categorias}
          value={linha.id_categoria ?? ""}
          onValueChange={(v) => onChange({ id_categoria: v })}
          placeholder="Selecione"
          className="h-9"
        />
      </TableCell>
      <TableCell>
        <Select
          value={linha.id_forma_pagamento ?? ""}
          onValueChange={(v) => onChange({ id_forma_pagamento: v })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {formasPagamento.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.descricao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <VeiculoSelect
          veiculos={veiculos}
          value={linha.id_estoque}
          onChange={(id) => onChange({ id_estoque: id })}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-accent hover:bg-accent/20"
            onClick={onImportSingle}
            title="Importar apenas este registro"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/20"
            onClick={onRemove}
            title="Remover"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface PessoaSelectProps {
  pessoas: Pessoa[];
  value: string | null;
  fallbackLabel: string;
  onChange: (id: string | null) => void;
}

function PessoaSelect({ pessoas, value, fallbackLabel, onChange }: PessoaSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = pessoas.find((p) => p.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="h-9 flex-1 justify-between font-normal"
        >
          <span className="truncate">
            {selected?.nome ?? (
              <span className="text-muted-foreground">
                {fallbackLabel || "Selecione"}
              </span>
            )}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[280px]" align="start">
        <Command>
          <CommandInput placeholder="Buscar pessoa..." />
          <CommandList>
            <CommandEmpty>Nenhuma pessoa encontrada</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")}
                />
                <span className="text-muted-foreground">Nenhuma</span>
              </CommandItem>
              {pessoas.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.nome}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === p.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {p.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface VeiculoSelectProps {
  veiculos: Veiculo[];
  value: number | null;
  onChange: (id: number | null) => void;
}

function VeiculoSelect({ veiculos, value, onChange }: VeiculoSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = veiculos.find((v) => v.id === value);
  const labelOf = (v: Veiculo) =>
    `${v.fabricante ?? ""} ${v.modelo ?? ""} ${v.placa ? `- ${v.placa}` : ""}`.trim();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="h-9 w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected ? labelOf(selected) : (
              <span className="text-muted-foreground">Selecione</span>
            )}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]" align="start">
        <Command>
          <CommandInput placeholder="Buscar veículo..." />
          <CommandList>
            <CommandEmpty>Nenhum veículo encontrado</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")}
                />
                <span className="text-muted-foreground">Nenhum</span>
              </CommandItem>
              {veiculos.map((v) => (
                <CommandItem
                  key={v.id}
                  value={labelOf(v)}
                  onSelect={() => {
                    onChange(v.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === v.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {labelOf(v)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
