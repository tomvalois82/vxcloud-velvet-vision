import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  options: MultiSelectOption[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  width?: string;
}

export function MultiSelectFilter({
  options,
  selected,
  onSelectedChange,
  placeholder = "Selecionar...",
  icon,
  className,
  width = "w-[220px]",
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);

  const allSelected = selected.length === 0 || selected.length === options.length;

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      const next = selected.filter((v) => v !== value);
      onSelectedChange(next);
    } else {
      const next = [...selected, value];
      // If all selected, reset to empty (meaning "todos")
      if (next.length === options.length) {
        onSelectedChange([]);
      } else {
        onSelectedChange(next);
      }
    }
  };

  const selectAll = () => {
    onSelectedChange([]);
  };

  const displayLabel = () => {
    if (allSelected) return placeholder;
    if (selected.length === 1) {
      const opt = options.find((o) => o.value === selected[0]);
      return opt?.label || selected[0];
    }
    return `${selected.length} selecionados`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between bg-background/50 border-border/50 font-normal h-10",
            width,
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {icon}
            <span className="truncate">{displayLabel()}</span>
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }} align="start">
        <div className="max-h-60 overflow-y-auto p-1">
          {/* Todos option */}
          <button
            type="button"
            onClick={selectAll}
            className={cn(
              "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
              allSelected && "font-medium"
            )}
          >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
              {allSelected && <Check className="h-4 w-4" />}
            </span>
            Todos
          </button>

          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {isSelected && !allSelected && <Check className="h-4 w-4" />}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
