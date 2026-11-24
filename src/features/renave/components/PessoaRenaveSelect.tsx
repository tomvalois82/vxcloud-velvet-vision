import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PessoaRenave } from '../utils/pendencias';
import { formatarDocumento } from '../utils/documento';


interface Props {
  pessoas: PessoaRenave[];
  valor: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Seletor pesquisável de pessoas (nome ou CPF/CNPJ).
export function PessoaRenaveSelect({ pessoas, valor, onChange, disabled, placeholder = 'Selecione a pessoa' }: Props) {
  const [aberto, setAberto] = useState(false);
  const selecionada = pessoas.find((p) => p.id === valor);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" disabled={disabled} className="w-full justify-between font-normal">
          <span className="truncate">{selecionada ? selecionada.nome : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome ou CPF/CNPJ..." />
          <CommandList>
            <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
            <CommandGroup>
              {pessoas.map((p) => (
                <CommandItem key={p.id} value={`${p.nome} ${p.cpf_cnpj || ''} ${p.id}`} onSelect={() => { onChange(p.id); setAberto(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', p.id === valor ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{p.nome}</span>
                  {p.cpf_cnpj && <span className="ml-auto text-xs text-muted-foreground">{formatarDocumento(p.cpf_cnpj)}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
