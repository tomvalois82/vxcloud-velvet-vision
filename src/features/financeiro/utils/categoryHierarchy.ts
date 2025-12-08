// Utility for hierarchical category organization

export interface CategoriaBase {
  id: string;
  categoria: string;
  operacao?: string;
  id_categoria_pai?: string | null;
  ativo?: boolean;
}

export interface CategoriaComNivel extends CategoriaBase {
  nivel: number;
  displayName: string;
}

/**
 * Organizes categories hierarchically and calculates indentation levels
 * Returns a flat list ordered by hierarchy with level information
 */
export function organizarCategoriasHierarquicamente<T extends CategoriaBase>(
  categorias: T[]
): (T & { nivel: number; displayName: string })[] {
  // Build parent-child map
  const childrenMap = new Map<string | null, T[]>();
  
  categorias.forEach(cat => {
    const parentId = cat.id_categoria_pai || null;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(cat);
  });

  // Sort children alphabetically
  childrenMap.forEach(children => {
    children.sort((a, b) => a.categoria.localeCompare(b.categoria));
  });

  // Recursively build flat list with levels
  const result: (T & { nivel: number; displayName: string })[] = [];
  
  function addCategoriasRecursively(parentId: string | null, nivel: number) {
    const children = childrenMap.get(parentId) || [];
    children.forEach(cat => {
      const indentation = "  ".repeat(nivel); // 2 spaces per level
      result.push({
        ...cat,
        nivel,
        displayName: `${indentation}${cat.categoria}`,
      });
      addCategoriasRecursively(cat.id, nivel + 1);
    });
  }

  addCategoriasRecursively(null, 0);
  
  return result;
}

/**
 * Gets the full path of a category (e.g., "Parent → Child → Grandchild")
 */
export function getCategoriaPath<T extends CategoriaBase>(
  categoria: T,
  allCategorias: T[]
): string {
  const path: string[] = [categoria.categoria];
  let current = categoria;
  
  while (current.id_categoria_pai) {
    const parent = allCategorias.find(c => c.id === current.id_categoria_pai);
    if (parent) {
      path.unshift(parent.categoria);
      current = parent;
    } else {
      break;
    }
  }
  
  return path.join(" → ");
}
