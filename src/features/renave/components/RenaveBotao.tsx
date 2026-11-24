import { useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRenaveHabilitado } from '../hooks/use-renave-habilitado';
import { RenaveProcessoDialog } from './RenaveProcessoDialog';

interface Props {
  idEstoque: number | null | undefined;
  rotulo?: string;
  variante?: 'icone' | 'botao';
}

// Ação "RENAVE" que abre o processo do ciclo; só aparece com o RENAVE habilitado na empresa.
export function RenaveBotao({ idEstoque, rotulo = 'RENAVE', variante = 'botao' }: Props) {
  const habilitado = useRenaveHabilitado();
  const [aberto, setAberto] = useState(false);
  if (!habilitado || !idEstoque) return null;
  const abrir = (e: React.MouseEvent) => { e.stopPropagation(); setAberto(true); };
  return (
    <>
      {variante === 'icone' ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={abrir} aria-label={rotulo}>
              <FileCheck2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{rotulo}</TooltipContent>
        </Tooltip>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={abrir}>
          <FileCheck2 className="mr-1 h-4 w-4" />{rotulo}
        </Button>
      )}
      {/* Impede que cliques dentro do diálogo propaguem para o card/linha */}
      <div onClick={(e) => e.stopPropagation()}>
        <RenaveProcessoDialog idEstoque={idEstoque} aberto={aberto} onFechar={() => setAberto(false)} />
      </div>
    </>
  );
}
