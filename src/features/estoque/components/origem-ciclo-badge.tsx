import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Aparência do badge de origem do ciclo, baseada apenas na coluna `origem`
// da view vw_estoque_ciclos: Compra (neutro), Troca (azul), Cadastro (cinza).
const ESTILOS: Record<string, { variant: 'outline' | 'secondary'; className?: string }> = {
  Compra: { variant: 'outline' },
  Troca: { variant: 'secondary', className: 'border-blue-500/40 bg-blue-500/20 text-blue-400' },
  Cadastro: { variant: 'secondary', className: 'border-border bg-muted text-muted-foreground' },
};

export function OrigemCicloBadge({ origem }: { origem?: string | null }) {
  const estilo = origem ? ESTILOS[origem] : undefined;
  if (!origem || !estilo) return null;
  return (
    <Badge
      variant={estilo.variant}
      className={cn('px-2 py-0 text-[10px] font-medium', estilo.className)}
    >
      {origem}
    </Badge>
  );
}
