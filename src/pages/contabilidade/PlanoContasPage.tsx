import { useState, useEffect, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ChevronRight, ChevronDown, Pencil, Trash2, FolderPlus, Loader2, Printer, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { PlanoContasDialog } from "@/features/contabilidade/components/PlanoContasDialog";
import { PlanoContasReportPrint } from "@/features/contabilidade/components/PlanoContasReportPrint";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlanoContas {
  id: string;
  nome_conta: string;
  codigo_estruturado: string;
  tipo_conta: string | null;
  natureza: string | null;
  id_pai: string | null;
  id_empresa: string | null;
  children?: PlanoContas[];
  hasChildren?: boolean;
}

export default function PlanoContasPage() {
  const [contas, setContas] = useState<PlanoContas[]>([]);
  const [allContasForPrint, setAllContasForPrint] = useState<PlanoContas[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipoConta, setFilterTipoConta] = useState<string>("todos");
  const [filterNatureza, setFilterNatureza] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contaToEdit, setContaToEdit] = useState<PlanoContas | null>(null);
  const [parentConta, setParentConta] = useState<PlanoContas | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<PlanoContas | null>(null);
  const [expandingAll, setExpandingAll] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Plano de Contas",
  });

  const fetchRootContas = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vx_fin_plano_contas")
        .select("*")
        .is("id_pai", null)
        .order("codigo_estruturado", { ascending: true });

      if (error) throw error;

      const contasWithChildInfo = await Promise.all(
        (data || []).map(async (c) => {
          const { count } = await supabase
            .from("vx_fin_plano_contas")
            .select("*", { count: "exact", head: true })
            .eq("id_pai", c.id);

          return { ...c, hasChildren: (count || 0) > 0, children: [] } as PlanoContas;
        })
      );

      setContas(contasWithChildInfo);
    } catch (error) {
      console.error("Erro ao buscar plano de contas:", error);
      toast.error("Erro ao carregar plano de contas");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllContasForPrint = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("vx_fin_plano_contas")
        .select("*")
        .order("codigo_estruturado", { ascending: true });

      if (error) throw error;

      const contaMap = new Map<string, PlanoContas>();
      const rootContas: PlanoContas[] = [];

      (data || []).forEach((c) => {
        contaMap.set(c.id, { ...c, children: [] } as PlanoContas);
      });

      (data || []).forEach((c) => {
        const conta = contaMap.get(c.id)!;
        if (c.id_pai) {
          const parent = contaMap.get(c.id_pai);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(conta);
          }
        } else {
          rootContas.push(conta);
        }
      });

      const sortByCodigo = (items: PlanoContas[]): PlanoContas[] => {
        return items
          .sort((a, b) => (a.codigo_estruturado || "").localeCompare(b.codigo_estruturado || "", undefined, { numeric: true }))
          .map((c) => ({ ...c, children: c.children ? sortByCodigo(c.children) : [] }));
      };

      setAllContasForPrint(sortByCodigo(rootContas));
    } catch (error) {
      console.error("Erro ao buscar contas para impressão:", error);
    }
  }, []);

  useEffect(() => {
    fetchRootContas();
    fetchAllContasForPrint();
  }, [fetchRootContas, fetchAllContasForPrint]);

  const loadChildren = async (parentId: string) => {
    setLoadingChildren((prev) => new Set(prev).add(parentId));

    try {
      const { data, error } = await supabase
        .from("vx_fin_plano_contas")
        .select("*")
        .eq("id_pai", parentId)
        .order("codigo_estruturado", { ascending: true });

      if (error) throw error;

      const childrenWithInfo = await Promise.all(
        (data || []).map(async (c) => {
          const { count } = await supabase
            .from("vx_fin_plano_contas")
            .select("*", { count: "exact", head: true })
            .eq("id_pai", c.id);

          return { ...c, hasChildren: (count || 0) > 0, children: [] } as PlanoContas;
        })
      );

      setContas((prev) => updateTreeChildren(prev, parentId, childrenWithInfo));
    } catch (error) {
      console.error("Erro ao carregar subcontas:", error);
      toast.error("Erro ao carregar subcontas");
    } finally {
      setLoadingChildren((prev) => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    }
  };

  const updateTreeChildren = (tree: PlanoContas[], parentId: string, children: PlanoContas[]): PlanoContas[] => {
    return tree.map((c) => {
      if (c.id === parentId) return { ...c, children };
      if (c.children && c.children.length > 0) return { ...c, children: updateTreeChildren(c.children, parentId, children) };
      return c;
    });
  };

  const toggleExpand = async (conta: PlanoContas) => {
    const newExpanded = new Set(expandedIds);

    if (newExpanded.has(conta.id)) {
      newExpanded.delete(conta.id);
    } else {
      newExpanded.add(conta.id);
      if (conta.hasChildren && (!conta.children || conta.children.length === 0)) {
        await loadChildren(conta.id);
      }
    }

    setExpandedIds(newExpanded);
  };

  const loadAllChildrenRecursive = async (items: PlanoContas[]): Promise<PlanoContas[]> => {
    return await Promise.all(
      items.map(async (c) => {
        if (!c.hasChildren) return c;

        if (!c.children || c.children.length === 0) {
          const { data } = await supabase
            .from("vx_fin_plano_contas")
            .select("*")
            .eq("id_pai", c.id)
            .order("codigo_estruturado", { ascending: true });

          const children = await Promise.all(
            (data || []).map(async (child) => {
              const { count } = await supabase
                .from("vx_fin_plano_contas")
                .select("*", { count: "exact", head: true })
                .eq("id_pai", child.id);
              return { ...child, hasChildren: (count || 0) > 0, children: [] } as PlanoContas;
            })
          );

          const loadedChildren = await loadAllChildrenRecursive(children);
          return { ...c, children: loadedChildren };
        }

        const loadedChildren = await loadAllChildrenRecursive(c.children);
        return { ...c, children: loadedChildren };
      })
    );
  };

  const collectAllIds = (items: PlanoContas[]): string[] => {
    return items.flatMap((c) => [c.id, ...(c.children ? collectAllIds(c.children) : [])]);
  };

  const handleToggleExpandAll = async () => {
    const allIds = collectAllIds(contas);
    const allExpanded = allIds.length > 0 && allIds.every((id) => expandedIds.has(id));

    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandingAll(true);
      try {
        const fullyLoaded = await loadAllChildrenRecursive(contas);
        setContas(fullyLoaded);
        const newExpanded = new Set(expandedIds);
        collectAllIds(fullyLoaded).forEach((id) => newExpanded.add(id));
        setExpandedIds(newExpanded);
      } finally {
        setExpandingAll(false);
      }
    }
  };

  const handleNew = () => {
    setContaToEdit(null);
    setParentConta(null);
    setDialogOpen(true);
  };

  const handleNewSubconta = (parent: PlanoContas) => {
    setContaToEdit(null);
    setParentConta(parent);
    setDialogOpen(true);
  };

  const handleEdit = (conta: PlanoContas) => {
    setContaToEdit(conta);
    setParentConta(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (conta: PlanoContas) => {
    setContaToDelete(conta);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contaToDelete) return;

    try {
      const { count: childCount } = await supabase
        .from("vx_fin_plano_contas")
        .select("*", { count: "exact", head: true })
        .eq("id_pai", contaToDelete.id);

      if (childCount && childCount > 0) {
        toast.error("Não é possível excluir uma conta que possui subcontas.");
        setDeleteDialogOpen(false);
        setContaToDelete(null);
        return;
      }

      // Check if linked to categories
      const { count: catCount } = await supabase
        .from("vx_fin_categoria")
        .select("*", { count: "exact", head: true })
        .eq("id_plano_contas", contaToDelete.id);

      if (catCount && catCount > 0) {
        toast.error("Não é possível excluir conta vinculada a categorias financeiras.");
        setDeleteDialogOpen(false);
        setContaToDelete(null);
        return;
      }

      const { error } = await supabase
        .from("vx_fin_plano_contas")
        .delete()
        .eq("id", contaToDelete.id);

      if (error) throw error;

      toast.success("Conta excluída com sucesso!");
      fetchRootContas();
      fetchAllContasForPrint();
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      toast.error("Erro ao excluir conta");
    } finally {
      setDeleteDialogOpen(false);
      setContaToDelete(null);
    }
  };

  const filterContasRecursive = (items: PlanoContas[]): PlanoContas[] => {
    if (filterTipoConta === "todos" && filterNatureza === "todos" && !searchTerm) return items;

    return items.reduce<PlanoContas[]>((acc, c) => {
      const matchesSearch = !searchTerm || c.nome_conta.toLowerCase().includes(searchTerm.toLowerCase()) || c.codigo_estruturado.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo = filterTipoConta === "todos" || c.tipo_conta === filterTipoConta;
      const matchesNatureza = filterNatureza === "todos" || c.natureza === filterNatureza;

      const filteredChildren = c.children ? filterContasRecursive(c.children) : [];
      const selfMatches = matchesSearch && matchesTipo && matchesNatureza;

      if (selfMatches || filteredChildren.length > 0) {
        acc.push({ ...c, children: selfMatches ? (c.children ? filterContasRecursive(c.children) : []) : filteredChildren });
      }
      return acc;
    }, []);
  };

  const printContas = filterContasRecursive(allContasForPrint);

  const handleDialogClose = (saved: boolean) => {
    setDialogOpen(false);
    setContaToEdit(null);
    setParentConta(null);
    if (saved) {
      fetchRootContas();
      fetchAllContasForPrint();
    }
  };

  const filterContas = (items: PlanoContas[], term: string): PlanoContas[] => {
    if (!term && filterTipoConta === "todos" && filterNatureza === "todos") return items;

    return items.filter((c) => {
      const matchesSearch = !term || c.nome_conta.toLowerCase().includes(term.toLowerCase()) || c.codigo_estruturado.toLowerCase().includes(term.toLowerCase());
      const matchesTipo = filterTipoConta === "todos" || c.tipo_conta === filterTipoConta;
      const matchesNatureza = filterNatureza === "todos" || c.natureza === filterNatureza;
      const hasMatchingChildren = c.children && filterContas(c.children, term).length > 0;
      return (matchesSearch && matchesTipo && matchesNatureza) || hasMatchingChildren;
    });
  };

  const filteredContas = filterContas(contas, searchTerm);

  const allIds = collectAllIds(filteredContas);
  const allExpanded = allIds.length > 0 && allIds.every((id) => expandedIds.has(id));

  const renderContaItem = (conta: PlanoContas, level: number = 0) => {
    const isExpanded = expandedIds.has(conta.id);
    const isLoadingChildren = loadingChildren.has(conta.id);
    const paddingLeft = level * 24 + 12;

    return (
      <div key={conta.id} className="w-full">
        <div
          className="group flex items-center gap-2 py-3 px-3 rounded-lg hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-border/50"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <button
            onClick={() => toggleExpand(conta)}
            className={`w-6 h-6 flex items-center justify-center rounded transition-all duration-200 ${
              conta.hasChildren
                ? "hover:bg-accent/20 text-muted-foreground hover:text-accent"
                : "invisible"
            }`}
            disabled={!conta.hasChildren}
          >
            {isLoadingChildren ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="w-4 h-4 transition-transform duration-200" />
            ) : (
              <ChevronRight className="w-4 h-4 transition-transform duration-200" />
            )}
          </button>

          <span className="text-xs text-muted-foreground font-mono min-w-[60px]">
            {conta.codigo_estruturado}
          </span>

          <span className="flex-1 text-foreground font-medium">
            {conta.nome_conta}
            {conta.natureza && (
              <span className="text-xs text-muted-foreground font-normal ml-1">
                ({conta.natureza})
              </span>
            )}
          </span>

          {conta.tipo_conta && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              conta.tipo_conta === "Analítica"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-purple-500/20 text-purple-400"
            }`}>
              {conta.tipo_conta}
            </span>
          )}

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-accent"
              onClick={() => handleNewSubconta(conta)}
              title="Adicionar subconta"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => handleEdit(conta)}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleDeleteClick(conta)}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isExpanded && conta.children && conta.children.length > 0 && (
          <div className="overflow-hidden transition-all duration-300 ease-in-out">
            {conta.children.map((child) => renderContaItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plano de Contas"
        description="Gerencie o plano de contas contábil em estrutura hierárquica"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handlePrint()} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          </div>
        }
      />

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterTipoConta} onValueChange={setFilterTipoConta}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Tipos</SelectItem>
            <SelectItem value="Analítica">Analítica</SelectItem>
            <SelectItem value="Sintética">Sintética</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterNatureza} onValueChange={setFilterNatureza}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Natureza" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="Devedora">Devedora</SelectItem>
            <SelectItem value="Credora">Credora</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hidden Print Component */}
      <div style={{ display: "none" }}>
        <PlanoContasReportPrint ref={printRef} contas={printContas} />
      </div>

      {/* Single Panel */}
      <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-blue-500/10 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Plano de Contas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{filteredContas.length} contas raiz</p>
          </div>
          {filteredContas.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleToggleExpandAll}
              disabled={expandingAll}
            >
              {expandingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : allExpanded ? (
                <ChevronsDownUp className="h-4 w-4" />
              ) : (
                <ChevronsUpDown className="h-4 w-4" />
              )}
              {allExpanded ? "Recolher" : "Expandir"}
            </Button>
          )}
        </div>

        <div className="p-4 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContas.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nenhuma conta"
              description={searchTerm ? "Tente buscar por outro termo" : "Crie a primeira conta do plano"}
            />
          ) : (
            <div className="space-y-1">
              {filteredContas.map((conta) => renderContaItem(conta, 0))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog */}
      <PlanoContasDialog
        open={dialogOpen}
        onOpenChange={(open) => !open && handleDialogClose(false)}
        conta={contaToEdit}
        parentConta={parentConta}
        onSave={() => handleDialogClose(true)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta "{contaToDelete?.nome_conta}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
