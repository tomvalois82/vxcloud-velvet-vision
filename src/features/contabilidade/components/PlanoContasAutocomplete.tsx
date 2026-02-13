import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

interface PlanoContasBase {
  id: string;
  nome_conta: string;
  codigo_estruturado: string;
  tipo_conta: string | null;
  id_pai: string | null;
}

interface PlanoContasAutocompleteProps {
  contas: PlanoContasBase[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  includeNoneOption?: boolean;
  noneOptionLabel?: string;
  allowSelectAll?: boolean;
}

function organizarHierarquicamente(contas: PlanoContasBase[]): (PlanoContasBase & { nivel: number })[] {
  const childrenMap = new Map<string | null, PlanoContasBase[]>();

  contas.forEach(c => {
    const parentId = c.id_pai || null;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(c);
  });

  childrenMap.forEach(children => {
    children.sort((a, b) => (a.codigo_estruturado || "").localeCompare(b.codigo_estruturado || "", undefined, { numeric: true }));
  });

  const result: (PlanoContasBase & { nivel: number })[] = [];

  function addRecursively(parentId: string | null, nivel: number) {
    const children = childrenMap.get(parentId) || [];
    children.forEach(c => {
      result.push({ ...c, nivel });
      addRecursively(c.id, nivel + 1);
    });
  }

  addRecursively(null, 0);
  return result;
}

export function PlanoContasAutocomplete({
  contas,
  value,
  onValueChange,
  placeholder = "Selecione a conta",
  disabled = false,
  className,
  includeNoneOption = false,
  noneOptionLabel = "Nenhuma",
  allowSelectAll = true,
}: PlanoContasAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const contasHierarquicas = useMemo(() => organizarHierarquicamente(contas), [contas]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contasHierarquicas;
    const s = search.toLowerCase();
    return contasHierarquicas.filter(c => c.nome_conta.toLowerCase().includes(s) || c.codigo_estruturado.toLowerCase().includes(s));
  }, [contasHierarquicas, search]);

  const selected = useMemo(() => contasHierarquicas.find(c => c.id === value), [contasHierarquicas, value]);

  const displayValue = useMemo(() => {
    if (includeNoneOption && value === "__none__") return noneOptionLabel;
    return selected ? `${selected.codigo_estruturado} - ${selected.nome_conta}` : "";
  }, [selected, includeNoneOption, value, noneOptionLabel]);

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
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar conta..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
            <CommandGroup>
              {includeNoneOption && (
                <CommandItem
                  value="__none__"
                  onSelect={() => { onValueChange("__none__"); setOpen(false); setSearch(""); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === "__none__" ? "opacity-100" : "opacity-0")} />
                  {noneOptionLabel}
                </CommandItem>
              )}
              {filtered.map((c) => {
                const isSintetica = c.tipo_conta !== "Analítica";
                const isDisabled = allowSelectAll ? false : isSintetica;

                return (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    disabled={isDisabled}
                    onSelect={() => {
                      if (isDisabled) return;
                      onValueChange(c.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      !allowSelectAll && isSintetica && "opacity-50 bg-muted/50 cursor-not-allowed",
                      "font-medium text-foreground"
                    )}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                    <span style={{ paddingLeft: `${c.nivel * 16}px` }}>
                      <span className="text-muted-foreground font-mono text-xs mr-2">{c.codigo_estruturado}</span>
                      {c.nome_conta}
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
