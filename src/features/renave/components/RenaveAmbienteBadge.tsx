import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  ambiente: string | null | undefined;
  compacto?: boolean;
  className?: string;
}

// Indica o ambiente do RENAVE; na versão compacta (listas) só sinaliza homologação.
export function RenaveAmbienteBadge({ ambiente, compacto = false, className }: Props) {
  if (ambiente === 'homologacao') {
    return (
      <Badge variant="outline" className={cn('border-amber-500/50 bg-amber-500/15 px-2 py-0 text-[10px] font-semibold text-amber-500', className)}>
        {compacto ? 'TESTE' : 'HOMOLOGAÇÃO (teste)'}
      </Badge>
    );
  }
  if (ambiente === 'producao' && !compacto) {
    return (
      <Badge variant="outline" className={cn('border-green-500/50 bg-green-500/15 px-2 py-0 text-[10px] font-semibold text-green-500', className)}>
        PRODUÇÃO
      </Badge>
    );
  }
  return null;
}
