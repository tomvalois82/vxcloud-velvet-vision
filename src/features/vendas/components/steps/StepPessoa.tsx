import { useState } from 'react';
import { Plus, Search, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PessoaDialog } from '@/features/pessoas/components/PessoaDialog';
import type { SalePerson } from '../../types';

interface StepPessoaProps {
  saleData: {
    id_cliente: string | null;
    id_vendedor: string | null;
    cliente?: SalePerson | null;
    vendedor?: SalePerson | null;
  };
  clientes: SalePerson[];
  colaboradores: SalePerson[];
  setCliente: (cliente: SalePerson | null) => void;
  setVendedor: (vendedor: SalePerson | null) => void;
}

export function StepPessoa({
  saleData,
  clientes,
  colaboradores,
  setCliente,
  setVendedor,
}: StepPessoaProps) {
  const [searchCliente, setSearchCliente] = useState('');
  const [searchVendedor, setSearchVendedor] = useState('');
  const [pessoaDialogOpen, setPessoaDialogOpen] = useState(false);
  const [pessoaDialogType, setPessoaDialogType] = useState<'cliente' | 'colaborador'>('cliente');

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchCliente.toLowerCase()) ||
    c.cpf_cnpj.includes(searchCliente)
  );

  const filteredColaboradores = colaboradores.filter(c => 
    c.nome.toLowerCase().includes(searchVendedor.toLowerCase()) ||
    c.cpf_cnpj.includes(searchVendedor)
  );

  const handleAddPessoa = (type: 'cliente' | 'colaborador') => {
    setPessoaDialogType(type);
    setPessoaDialogOpen(true);
  };

  const formatCpfCnpj = (value: string) => {
    if (value.length === 11) {
      return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (value.length === 14) {
      return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const PersonCard = ({ 
    person, 
    isSelected, 
    onClick 
  }: { 
    person: SalePerson; 
    isSelected: boolean; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-lg text-left transition-all border",
        isSelected 
          ? "bg-accent/20 border-accent" 
          : "bg-muted/50 border-transparent hover:border-accent/50"
      )}
    >
      <p className="font-medium text-foreground">{person.nome}</p>
      <p className="text-sm text-muted-foreground">{formatCpfCnpj(person.cpf_cnpj)}</p>
      {person.telefone && (
        <p className="text-sm text-muted-foreground">{person.telefone}</p>
      )}
    </button>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cliente Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-accent" />
              <Label className="text-lg font-semibold">Cliente (Comprador)</Label>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddPessoa('cliente')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF/CNPJ..."
              value={searchCliente}
              onChange={(e) => setSearchCliente(e.target.value)}
              className="pl-10"
            />
          </div>

          {saleData.cliente && (
            <div className="p-4 rounded-lg bg-accent/10 border border-accent">
              <p className="text-xs text-accent mb-1">Selecionado:</p>
              <p className="font-semibold text-foreground">{saleData.cliente.nome}</p>
              <p className="text-sm text-muted-foreground">{formatCpfCnpj(saleData.cliente.cpf_cnpj)}</p>
            </div>
          )}

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredClientes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum cliente encontrado
                </p>
              ) : (
                filteredClientes.map(cliente => (
                  <PersonCard
                    key={cliente.id}
                    person={cliente}
                    isSelected={saleData.id_cliente === cliente.id}
                    onClick={() => setCliente(cliente)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Vendedor Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              <Label className="text-lg font-semibold">Vendedor (Colaborador)</Label>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddPessoa('colaborador')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF/CNPJ..."
              value={searchVendedor}
              onChange={(e) => setSearchVendedor(e.target.value)}
              className="pl-10"
            />
          </div>

          {saleData.vendedor && (
            <div className="p-4 rounded-lg bg-accent/10 border border-accent">
              <p className="text-xs text-accent mb-1">Selecionado:</p>
              <p className="font-semibold text-foreground">{saleData.vendedor.nome}</p>
              <p className="text-sm text-muted-foreground">{formatCpfCnpj(saleData.vendedor.cpf_cnpj)}</p>
            </div>
          )}

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredColaboradores.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum colaborador encontrado
                </p>
              ) : (
                filteredColaboradores.map(colaborador => (
                  <PersonCard
                    key={colaborador.id}
                    person={colaborador}
                    isSelected={saleData.id_vendedor === colaborador.id}
                    onClick={() => setVendedor(colaborador)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Validation Message */}
      {(!saleData.id_cliente || !saleData.id_vendedor) && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50">
          <p className="text-sm text-destructive">
            {!saleData.id_cliente && !saleData.id_vendedor
              ? 'Selecione um cliente e um vendedor para continuar.'
              : !saleData.id_cliente
                ? 'Selecione um cliente para continuar.'
                : 'Selecione um vendedor para continuar.'}
          </p>
        </div>
      )}

      <PessoaDialog
        open={pessoaDialogOpen}
        onOpenChange={setPessoaDialogOpen}
        pessoa={null}
        onSuccess={() => {
          setPessoaDialogOpen(false);
          // Would need to refresh the list - for now just close
        }}
      />
    </div>
  );
}
