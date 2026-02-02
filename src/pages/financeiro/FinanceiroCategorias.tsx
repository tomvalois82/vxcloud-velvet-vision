import { useState, useEffect, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronRight, ChevronDown, Pencil, Trash2, FolderPlus, Loader2, FileText, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { CategoriaDialog } from "@/features/financeiro/components/CategoriaDialog";
import { CategoriasReportPrint } from "@/features/financeiro/components/CategoriasReportPrint";
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

interface Categoria {
  id: string;
  categoria: string;
  id_categoria_pai: string | null;
  ativo: boolean;
  operacao: string;
  dre: boolean;
  classificacao: string | null;
  children?: Categoria[];
  hasChildren?: boolean;
}

export default function FinanceiroCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [allCategoriasForPrint, setAllCategoriasForPrint] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoriaToEdit, setCategoriaToEdit] = useState<Categoria | null>(null);
  const [parentCategoria, setParentCategoria] = useState<Categoria | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);
  const [togglingDre, setTogglingDre] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Relatório de Categorias",
  });

  const fetchRootCategorias = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vx_fin_categoria")
        .select("*")
        .is("id_categoria_pai", null)
        .order("categoria");

      if (error) throw error;

      // Check which categories have children
      const categoriesWithChildInfo = await Promise.all(
        (data || []).map(async (cat) => {
          const { count } = await supabase
            .from("vx_fin_categoria")
            .select("*", { count: "exact", head: true })
            .eq("id_categoria_pai", cat.id);
          
          return {
            ...cat,
            hasChildren: (count || 0) > 0,
            children: [],
          };
        })
      );

      setCategorias(categoriesWithChildInfo);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all categories with hierarchy for printing
  const fetchAllCategoriasForPrint = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("vx_fin_categoria")
        .select("*")
        .order("categoria");

      if (error) throw error;

      // Build hierarchy
      const categoriaMap = new Map<string, Categoria>();
      const rootCategories: Categoria[] = [];

      (data || []).forEach((cat) => {
        categoriaMap.set(cat.id, { ...cat, children: [] });
      });

      (data || []).forEach((cat) => {
        const categoria = categoriaMap.get(cat.id)!;
        if (cat.id_categoria_pai) {
          const parent = categoriaMap.get(cat.id_categoria_pai);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(categoria);
          }
        } else {
          rootCategories.push(categoria);
        }
      });

      setAllCategoriasForPrint(rootCategories);
    } catch (error) {
      console.error("Erro ao buscar categorias para impressão:", error);
    }
  }, []);

  useEffect(() => {
    fetchRootCategorias();
    fetchAllCategoriasForPrint();
  }, [fetchRootCategorias, fetchAllCategoriasForPrint]);

  const loadChildren = async (parentId: string) => {
    setLoadingChildren((prev) => new Set(prev).add(parentId));
    
    try {
      const { data, error } = await supabase
        .from("vx_fin_categoria")
        .select("*")
        .eq("id_categoria_pai", parentId)
        .order("categoria");

      if (error) throw error;

      // Check which children have their own children
      const childrenWithInfo = await Promise.all(
        (data || []).map(async (cat) => {
          const { count } = await supabase
            .from("vx_fin_categoria")
            .select("*", { count: "exact", head: true })
            .eq("id_categoria_pai", cat.id);
          
          return {
            ...cat,
            hasChildren: (count || 0) > 0,
            children: [],
          };
        })
      );

      // Update the tree with new children
      setCategorias((prev) => updateTreeChildren(prev, parentId, childrenWithInfo));
    } catch (error) {
      console.error("Erro ao carregar subcategorias:", error);
      toast.error("Erro ao carregar subcategorias");
    } finally {
      setLoadingChildren((prev) => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    }
  };

  const updateTreeChildren = (
    tree: Categoria[],
    parentId: string,
    children: Categoria[]
  ): Categoria[] => {
    return tree.map((cat) => {
      if (cat.id === parentId) {
        return { ...cat, children };
      }
      if (cat.children && cat.children.length > 0) {
        return { ...cat, children: updateTreeChildren(cat.children, parentId, children) };
      }
      return cat;
    });
  };

  const updateTreeDre = (
    tree: Categoria[],
    catId: string,
    newDre: boolean
  ): Categoria[] => {
    return tree.map((cat) => {
      if (cat.id === catId) {
        return { ...cat, dre: newDre };
      }
      if (cat.children && cat.children.length > 0) {
        return { ...cat, children: updateTreeDre(cat.children, catId, newDre) };
      }
      return cat;
    });
  };

  const handleToggleDre = async (categoria: Categoria) => {
    setTogglingDre(categoria.id);
    try {
      const newDre = !categoria.dre;
      const { error } = await supabase
        .from("vx_fin_categoria")
        .update({ dre: newDre })
        .eq("id", categoria.id);

      if (error) throw error;

      setCategorias((prev) => updateTreeDre(prev, categoria.id, newDre));
      toast.success(newDre ? "Categoria será exibida no DRE" : "Categoria removida do DRE");
    } catch (error) {
      console.error("Erro ao atualizar DRE:", error);
      toast.error("Erro ao atualizar configuração de DRE");
    } finally {
      setTogglingDre(null);
    }
  };

  const toggleExpand = async (categoria: Categoria) => {
    const newExpanded = new Set(expandedIds);
    
    if (newExpanded.has(categoria.id)) {
      newExpanded.delete(categoria.id);
    } else {
      newExpanded.add(categoria.id);
      if (categoria.hasChildren && (!categoria.children || categoria.children.length === 0)) {
        await loadChildren(categoria.id);
      }
    }
    
    setExpandedIds(newExpanded);
  };

  const handleNew = () => {
    setCategoriaToEdit(null);
    setParentCategoria(null);
    setDialogOpen(true);
  };

  const handleNewSubcategoria = (parent: Categoria) => {
    setCategoriaToEdit(null);
    setParentCategoria(parent);
    setDialogOpen(true);
  };

  const handleEdit = (categoria: Categoria) => {
    setCategoriaToEdit(categoria);
    setParentCategoria(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (categoria: Categoria) => {
    setCategoriaToDelete(categoria);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoriaToDelete) return;

    try {
      // Check for subcategories
      const { count: childCount } = await supabase
        .from("vx_fin_categoria")
        .select("*", { count: "exact", head: true })
        .eq("id_categoria_pai", categoriaToDelete.id);

      if (childCount && childCount > 0) {
        toast.error("Não é possível excluir uma categoria que possui subcategorias.");
        setDeleteDialogOpen(false);
        setCategoriaToDelete(null);
        return;
      }

      // Check for linked movements
      const { count: movimentoCount } = await supabase
        .from("vx_fin_movimento")
        .select("*", { count: "exact", head: true })
        .eq("id_categoria", categoriaToDelete.id);

      if (movimentoCount && movimentoCount > 0) {
        toast.error("Não é possível excluir categoria utilizada em movimentações financeiras.");
        setDeleteDialogOpen(false);
        setCategoriaToDelete(null);
        return;
      }

      const { error } = await supabase
        .from("vx_fin_categoria")
        .delete()
        .eq("id", categoriaToDelete.id);

      if (error) throw error;

      toast.success("Categoria excluída com sucesso!");
      fetchRootCategorias();
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      toast.error("Erro ao excluir categoria");
    } finally {
      setDeleteDialogOpen(false);
      setCategoriaToDelete(null);
    }
  };

  // Separate categories for print
  const printCategoriasReceber = allCategoriasForPrint.filter((cat) => cat.operacao === "Receber");
  const printCategoriasPagar = allCategoriasForPrint.filter((cat) => cat.operacao === "Pagar");

  const handleDialogClose = (saved: boolean) => {
    setDialogOpen(false);
    setCategoriaToEdit(null);
    setParentCategoria(null);
    if (saved) {
      fetchRootCategorias();
      fetchAllCategoriasForPrint();
    }
  };

  const filterCategorias = (cats: Categoria[], term: string): Categoria[] => {
    if (!term) return cats;
    
    return cats.filter((cat) => {
      const matchesSearch = cat.categoria.toLowerCase().includes(term.toLowerCase());
      const hasMatchingChildren = cat.children && filterCategorias(cat.children, term).length > 0;
      return matchesSearch || hasMatchingChildren;
    });
  };

  const filteredCategorias = filterCategorias(categorias, searchTerm);
  
  // Separate categories by operation type
  const categoriasReceber = filteredCategorias.filter((cat) => cat.operacao === "Receber");
  const categoriasPagar = filteredCategorias.filter((cat) => cat.operacao === "Pagar");

  const renderCategoriaItem = (categoria: Categoria, level: number = 0, showBadge: boolean = false) => {
    const isExpanded = expandedIds.has(categoria.id);
    const isLoadingChildren = loadingChildren.has(categoria.id);
    const paddingLeft = level * 24 + 12;

    return (
      <div key={categoria.id} className="w-full">
        <div
          className="group flex items-center gap-2 py-3 px-3 rounded-lg hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-border/50"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleExpand(categoria)}
            className={`w-6 h-6 flex items-center justify-center rounded transition-all duration-200 ${
              categoria.hasChildren 
                ? "hover:bg-accent/20 text-muted-foreground hover:text-accent" 
                : "invisible"
            }`}
            disabled={!categoria.hasChildren}
          >
            {isLoadingChildren ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="w-4 h-4 transition-transform duration-200" />
            ) : (
              <ChevronRight className="w-4 h-4 transition-transform duration-200" />
            )}
          </button>

          {/* Category Name */}
          <span className="flex-1 text-foreground font-medium">
            {categoria.categoria}
            {categoria.classificacao && (
              <span className="text-xs text-muted-foreground font-normal ml-1">
                ({categoria.classificacao.replace(/_/g, ' ')})
              </span>
            )}
          </span>

          {/* Operation Badge - only show if requested */}
          {showBadge && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                categoria.operacao === "Receber"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {categoria.operacao}
            </span>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-accent"
              onClick={() => handleNewSubcategoria(categoria)}
              title="Adicionar subcategoria"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => handleEdit(categoria)}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 transition-colors ${
                categoria.dre 
                  ? "text-accent hover:text-accent/80" 
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
              onClick={() => handleToggleDre(categoria)}
              disabled={togglingDre === categoria.id}
              title="Exibido no DRE"
            >
              {togglingDre === categoria.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className={`h-4 w-4 ${categoria.dre ? "fill-accent/20" : ""}`} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleDeleteClick(categoria)}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && categoria.children && categoria.children.length > 0 && (
          <div className="overflow-hidden transition-all duration-300 ease-in-out">
            {categoria.children.map((child) => renderCategoriaItem(child, level + 1, showBadge))}
          </div>
        )}
      </div>
    );
  };

  const renderCategoryPanel = (
    title: string, 
    categories: Categoria[], 
    colorClass: string,
    emptyMessage: string
  ) => (
    <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Panel Header */}
      <div className={`px-4 py-3 border-b border-border ${colorClass}`}>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{categories.length} categorias</p>
      </div>
      
      {/* Panel Content */}
      <div className="p-4 min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhuma categoria"
            description={searchTerm ? "Tente buscar por outro termo" : emptyMessage}
          />
        ) : (
          <div className="space-y-1">
            {categories.map((categoria) => renderCategoriaItem(categoria, 0, false))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plano de Contas / Categorias"
        description="Gerencie as categorias financeiras em estrutura hierárquica"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handlePrint()} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Categoria
            </Button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar categorias..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Hidden Print Component */}
      <div style={{ display: "none" }}>
        <CategoriasReportPrint
          ref={printRef}
          categoriasReceber={printCategoriasReceber}
          categoriasPagar={printCategoriasPagar}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receber (Left) */}
        {renderCategoryPanel(
          "Receber (Receitas)", 
          categoriasReceber, 
          "bg-emerald-500/10",
          "Crie categorias de receita"
        )}
        
        {/* Pagar (Right) */}
        {renderCategoryPanel(
          "Pagar (Despesas)", 
          categoriasPagar, 
          "bg-red-500/10",
          "Crie categorias de despesa"
        )}
      </div>

      {/* Dialog */}
      <CategoriaDialog
        open={dialogOpen}
        onOpenChange={(open) => !open && handleDialogClose(false)}
        categoria={categoriaToEdit}
        parentCategoria={parentCategoria}
        onSave={() => handleDialogClose(true)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{categoriaToDelete?.categoria}"?
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
