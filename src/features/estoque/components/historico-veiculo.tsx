import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { buscarHistoricoVeiculo, type CicloHistorico } from '../services/historico-ciclos-service';
import { OrigemCicloBadge } from './origem-ciclo-badge';

export function HistoricoVeiculo({ idVeiculo, onView }: { idVeiculo: number; onView: (id: number) => void }) {
  const [ciclos, setCiclos] = useState<CicloHistorico[]>([]);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let cancelado = false;
    setCiclos([]);
    setErro(false);
    buscarHistoricoVeiculo(idVeiculo).then(resultado => {
      if (!cancelado) setCiclos(resultado);
    }).catch(() => {
      if (!cancelado) setErro(true);
    });
    return () => { cancelado = true; };
  }, [idVeiculo]);

  if (erro) return <p className="text-sm text-destructive" role="alert">Não foi possível carregar o histórico deste veículo.</p>;
  if (ciclos.length === 0) return null;
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-semibold text-foreground">Histórico deste veículo</h3>
      <div className="divide-y divide-border">
        {ciclos.map(ciclo => (
          <Button key={ciclo.id_estoque} type="button" variant="ghost"
            disabled={ciclo.id_estoque === null}
            aria-current={ciclo.id_estoque === idVeiculo ? 'true' : undefined}
            className="w-full h-auto justify-start gap-3 py-3 whitespace-normal text-left"
            onClick={() => { if (ciclo.id_estoque !== null) onView(ciclo.id_estoque); }}>
            <span className="min-w-0 flex-1 break-words">
              <span className="block font-semibold">Ciclo {ciclo.ciclo ?? '—'}{ciclo.id_estoque === idVeiculo ? ' · Selecionado' : ''}</span>
              <span className="block text-xs text-muted-foreground">{ciclo.descricao_ciclo || '—'}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant="outline" className="max-w-28 whitespace-normal">{ciclo.status || 'Sem status'}</Badge>
              <OrigemCicloBadge origem={ciclo.origem} />
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}