import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { infoEtapa } from '../utils/etapas';

export function RenaveEtapaBadge({ etapa, mostrarFora = false, className }: { etapa: string | null | undefined; mostrarFora?: boolean; className?: string }) {
  if (!etapa && !mostrarFora) return null;
  const info = infoEtapa(etapa);
  return (
    <Badge variant="secondary" className={cn('px-2 py-0 text-[10px] font-medium', info.classe, className)}>
      {info.rotulo}
    </Badge>
  );
}
