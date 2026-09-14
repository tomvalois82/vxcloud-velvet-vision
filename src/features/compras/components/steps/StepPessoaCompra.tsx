import { useState } from 'react';
import { Plus, Search, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PessoaDialog } from '@/features/pessoas/components/PessoaDialog';
import type { PurchaseData, PurchasePerson } from '../../types';

interface StepPessoaCompraProps {
  purchaseData: PurchaseData;
  fornecedores: PurchasePerson[];
  colaboradores: PurchasePerson[];
  setFornecedor: (pessoa: PurchasePerson | null) => void;
  setComprador: (pessoa: PurchasePerson | null) => void;
  refreshPessoas: () => Promise<void>;
}

function formatCpfCnpj(value: string | null) {
  if (!value) return '';
  if (value.length === 11) {
    return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (value.length === 14) {
    return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

export function StepPessoaCompra({
  purchaseData,
  fornecedores,
  colaboradores,
  setFornecedor,
  setComprador,
  refreshPessoas,
}: StepPessoaCompraProps) {
  const [buscaFornecedor, setBuscaFornecedor] = useState('');
  const [buscaComprador, setBuscaComprador] = useState('');
  const [pessoaDialogOpen, setPessoaDialogOpen] = useState(false);

  const filtrar = (lista: PurchasePerson[], termo: string) =>
    lista.filter(
      p =>
        p.nome.toLowerCase().includes(termo.toLowerCase()) ||
        (p.cpf_cnpj || '').includes(termo)
    );

  const PersonCard = ({
    person,
    isSelected,
    onClick,
  }: {
    person: PurchasePerson;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-lg text-left transition-all border',
        isSelected
          ? 'bg-accent/20 border-accent'
          : 'bg-muted/50 border-transparent hover:border-accent/50'
      )}
    >
      <p className="font-medium text-foreground">{person.nome}</p>
      <p className="text-sm text-muted-foreground">{formatCpfCnpj(person.cpf_cnpj)}</p>
      {person.telefone && <p className="text-sm text-muted-foreground">{person.telefone}</p>}
    </button>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Vendedor do veículo */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-accent" />
              <Label className="text-lg font-semibold">Cliente vendedor</Label>
            </div>
            <Button size="sm" variant="outline" onClick={() => setPessoaDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF/CNPJ..."
              value={buscaFornecedor}
              onChange={e => setBuscaFornecedor(e.target.value)}
              className="pl-10"
            />
          </div>

          {purchaseData.fornecedor && (
            <div className="p-4 rounded-lg bg-accent/10 border border-accent">
              <p className="text-xs text-accent mb-1">Selecionado:</p>
              <p className="font-semibold text-foreground">{purchaseData.fornecedor.nome}</p>
              <p className="text-sm text-muted-foreground">
                {formatCpfCnpj(purchaseData.fornecedor.cpf_cnpj)}
              </p>
            </div>
          )}

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filtrar(fornecedores, buscaFornecedor).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma pessoa encontrada</p>
              ) : (
                filtrar(fornecedores, buscaFornecedor).map(pessoa => (
                  <PersonCard
                    key={pessoa.id}
                    person={pessoa}
                    isSelected={purchaseData.id_fornecedor === pessoa.id}
                    onClick={() => setFornecedor(pessoa)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Comprador (colaborador) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              <Label className="text-lg font-semibold">Funcionário comprador</Label>
            </div>
            <Button size="sm" variant="outline" onClick={() => setPessoaDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF/CNPJ..."
              value={buscaComprador}
              onChange={e => setBuscaComprador(e.target.value)}
              className="pl-10"
            />
          </div>

          {purchaseData.comprador && (
            <div className="p-4 rounded-lg bg-accent/10 border border-accent">
              <p className="text-xs text-accent mb-1">Selecionado:</p>
              <p className="font-semibold text-foreground">{purchaseData.comprador.nome}</p>
              <p className="text-sm text-muted-foreground">
                {formatCpfCnpj(purchaseData.comprador.cpf_cnpj)}
              </p>
            </div>
          )}

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filtrar(colaboradores, buscaComprador).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum colaborador encontrado
                </p>
              ) : (
                filtrar(colaboradores, buscaComprador).map(pessoa => (
                  <PersonCard
                    key={pessoa.id}
                    person={pessoa}
                    isSelected={purchaseData.id_comprador === pessoa.id}
                    onClick={() => setComprador(pessoa)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {(!purchaseData.id_fornecedor || !purchaseData.id_comprador) && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50">
          <p className="text-sm text-destructive">
            Selecione o cliente vendedor e o funcionário comprador para continuar.
          </p>
        </div>
      )}

      <PessoaDialog
        open={pessoaDialogOpen}
        onOpenChange={setPessoaDialogOpen}
        pessoa={null}
        onSuccess={async () => {
          setPessoaDialogOpen(false);
          await refreshPessoas();
        }}
      />
    </div>
  );
}
