import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { organizarCategoriasHierarquicamente, CategoriaBase } from "../utils/categoryHierarchy";

interface CategoriaAutocompleteProps {
  categorias: CategoriaBase[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
}

export function CategoriaAutocomplete({
  categorias,
  value,
  onValueChange,
  placeholder = "Selecione a categoria",
  disabled = false,
  className,
  includeAllOption = false,
  allOptionLabel = "Todas",
}: CategoriaAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const categoriasHierarquicas = useMemo(() => {
    const ativas = categorias.filter(cat => cat.ativo !== false);
    return organizarCategoriasHierarquicamente(ativas);
  }, [categorias]);

  const filteredCategorias = useMemo(() => {
    if (!search.trim()) return categoriasHierarquicas;
    
    const searchLower = search.toLowerCase();
    return categoriasHierarquicas.filter(cat => 
      cat.categoria.toLowerCase().includes(searchLower)
    );
  }, [categoriasHierarquicas, search]);

  const selectedCategoria = useMemo(() => {
    if (includeAllOption && value === "__all__") return null;
    return categoriasHierarquicas.find(cat => cat.id === value);
  }, [categoriasHierarquicas, value, includeAllOption]);

  const displayValue = useMemo(() => {
    if (includeAllOption && value === "__all__") return allOptionLabel;
    return selectedCategoria?.categoria || "";
  }, [selectedCategoria, includeAllOption, value, allOptionLabel]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-background/50 border-border/50 font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar categoria..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
            <CommandGroup>
              {includeAllOption && (
                <CommandItem
                  value="__all__"
                  onSelect={() => {
                    onValueChange("__all__");
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "__all__" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {allOptionLabel}
                </CommandItem>
              )}
              {filteredCategorias.map((cat) => {
                const isSintetica = cat.tipo_conta === "Sintética";
                const isAnalitica = !isSintetica;
                
                return (
                  <CommandItem
                    key={cat.id}
                    value={cat.id}
                    disabled={isAnalitica}
                    onSelect={() => {
                      if (isAnalitica) return;
                      onValueChange(cat.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      isAnalitica && "opacity-50 bg-muted/50 cursor-not-allowed",
                      isSintetica && "font-medium text-foreground"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === cat.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span style={{ paddingLeft: `${cat.nivel * 16}px` }}>
                      {cat.categoria}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
