import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Car, Clock, ExternalLink, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { maskCurrency } from '@/features/estoque/utils/masks';
import type { Prospeccao } from '../services/prospeccao-service';

interface ProspeccaoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospeccao: Prospeccao | null;
}

const moeda = (v: number | null | undefined) => maskCurrency(Number(v ?? 0));

// Item de informação exibido como rótulo + valor
const Campo = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="space-y-0.5 min-w-0">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium break-words">{value ?? '—'}</p>
  </div>
);

// Bloco de valores com rótulo destacado
const CampoValor = ({ label, valor, destaque = false }: { label: string; valor: number | null; destaque?: boolean }) => (
  <div className="space-y-0.5 min-w-0">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-sm font-medium whitespace-nowrap ${destaque ? 'text-primary font-semibold' : ''}`}>{moeda(valor)}</p>
  </div>
);

export function ProspeccaoDetailDialog({ open, onOpenChange, prospeccao }: ProspeccaoDetailDialogProps) {
  if (!prospeccao) return null;
  const p = prospeccao;
  const custos = Number(p.custo_preparacao ?? 0) + Number(p.custo_plataforma ?? 0) + Number(p.custo_documentacao ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{[p.fabricante, p.modelo].filter(Boolean).join(' ') || 'Veículo de interesse'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Foto ampliada e atalhos de plataforma/laudo */}
          {p.foto ? (
            <img
              src={p.foto}
              alt={p.modelo ?? 'Veículo'}
              className="w-full max-h-[400px] object-contain rounded-lg border border-border bg-muted/30"
            />
          ) : (
            <div className="w-full h-40 rounded-lg border border-border bg-muted flex items-center justify-center">
              <Car className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {(p.link_plataforma || p.laudo_anexo) && (
            <div className="flex flex-wrap items-center gap-2">
              {p.link_plataforma && (
                <Button variant="outline" asChild>
                  <a href={p.link_plataforma} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir na plataforma
                  </a>
                </Button>
              )}
              {p.laudo_anexo && (
                <Button variant="outline" asChild>
                  <a href={p.laudo_anexo} target="_blank" rel="noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver laudo
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Veículo */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Veículo</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              <Campo label="Placa" value={p.placa ?? '—'} />
              <Campo label="Fabricante" value={p.fabricante ?? '—'} />
              <Campo label="Modelo" value={p.modelo ?? '—'} />
              <Campo label="Ano modelo" value={p.ano_modelo ?? '—'} />
              <Campo label="Ano fabricação" value={p.ano_fabricacao ?? '—'} />
              <Campo label="Cor" value={p.cor ?? '—'} />
              <Campo label="KM" value={p.km ? `${p.km} km` : '—'} />
              <Campo label="Combustível" value={p.combustivel ?? '—'} />
              <Campo label="Tipo de veículo" value={p.tipo_veiculo ?? '—'} />
            </div>
          </section>

          {/* Valores e custos */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Valores e custos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              <CampoValor label="Valor inicial" valor={p.valor_inicial} />
              <CampoValor label="FIPE" valor={p.fipe} />
              <CampoValor label="Valor de mercado" valor={p.valor_mercado} />
              <CampoValor label="Valor de compra" valor={p.valor_compra} />
              <Campo label="Margem" value={p.margem != null ? `${Number(p.margem)}%` : '—'} />
              <CampoValor label="Valor máximo" valor={p.valor_maximo} destaque />
              <CampoValor label="Custo de preparação" valor={p.custo_preparacao} />
              <CampoValor label="Custo da plataforma" valor={p.custo_plataforma} />
              <CampoValor label="Custo de documentação" valor={p.custo_documentacao} />
              <CampoValor label="Total de custos" valor={custos} />
            </div>
          </section>

          {/* Negociação */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Negociação</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              <Campo label="Plataforma" value={p.plataforma ?? '—'} />
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs text-muted-foreground">Término</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {p.data_hora_fim ? format(new Date(p.data_hora_fim), 'dd/MM/yyyy HH:mm') : '—'}
                </p>
              </div>
              <Campo label="Localização" value={p.localizacao ?? '—'} />
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={p.status === 'Em andamento' ? 'default' : 'secondary'}>{p.status ?? '—'}</Badge>
              </div>
              <Campo label="Laudo" value={p.laudo ?? '—'} />
            </div>
            <Campo label="Observação" value={p.observacao ?? '—'} />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
