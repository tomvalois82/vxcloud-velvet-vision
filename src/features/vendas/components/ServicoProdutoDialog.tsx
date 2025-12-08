import { useState, useEffect } from 'react';
import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { maskCurrency, unmaskCurrency } from '@/features/estoque/utils/masks';
import { toast } from 'sonner';
import { organizarCategoriasHierarquicamente } from '@/features/financeiro/utils/categoryHierarchy';
import type { ServicoProdutoEntry, CategoriaFinanceira } from '../types';

interface ServicoProdutoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: CategoriaFinanceira[];
  onAdd: (item: Omit<ServicoProdutoEntry, 'id'>) => void;
  onEdit?: (id: string, item: Omit<ServicoProdutoEntry, 'id'>) => void;
  editItem?: ServicoProdutoEntry | null;
}

export function ServicoProdutoDialog({
  open,
  onOpenChange,
  categorias,
  onAdd,
  onEdit,
  editItem,
}: ServicoProdutoDialogProps) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [idCategoria, setIdCategoria] = useState('');

  // Reset form when dialog opens/closes or editItem changes
  useEffect(() => {
    if (open) {
      if (editItem) {
        setDescricao(editItem.descricao);
        setValor(maskCurrency(editItem.valor));
        setIdCategoria(editItem.id_categoria);
      } else {
        setDescricao('');
        setValor('');
        setIdCategoria('');
      }
    }
  }, [open, editItem]);

  const handleSubmit = () => {
    if (!descricao.trim()) {
      toast.error('Informe a descrição');
      return;
    }

    const valorNum = unmaskCurrency(valor);
    if (valorNum <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    if (!idCategoria) {
      toast.error('Selecione uma categoria');
      return;
    }

    const categoria = categorias.find(c => c.id === idCategoria);
    const item: Omit<ServicoProdutoEntry, 'id'> = {
      descricao: descricao.trim(),
      valor: valorNum,
      id_categoria: idCategoria,
      id_veiculo: null,
      categoria_nome: categoria?.categoria,
    };

    if (editItem && onEdit) {
      onEdit(editItem.id, item);
      toast.success('Item atualizado com sucesso');
    } else {
      onAdd(item);
      toast.success('Item adicionado com sucesso');
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-accent" />
            {editItem ? 'Editar Produto/Serviço' : 'Adicionar Produto/Serviço'}
          </DialogTitle>
          <DialogDescription>
            Lançamentos de Produtos & Serviços
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Taxa de transferência, Acessório..."
            />
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="valor">Valor *</Label>
            <Input
              id="valor"
              value={valor}
              onChange={(e) => setValor(maskCurrency(unmaskCurrency(e.target.value)))}
              placeholder="R$ 0,00"
              className="text-accent font-medium"
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select value={idCategoria} onValueChange={setIdCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {organizarCategoriasHierarquicamente(categorias).map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span style={{ paddingLeft: `${cat.nivel * 16}px` }}>
                      {cat.categoria}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            className="bg-accent hover:bg-accent/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            {editItem ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
