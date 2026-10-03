import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Car, ExternalLink, Pencil, Plus, Search, Trash2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { maskCurrency } from '@/features/estoque/utils/masks';
import { ProspeccaoDialog } from '@/features/prospeccao/components/ProspeccaoDialog';
import {
  PLATAFORMAS, STATUS_PROSPECCAO, Prospeccao, buscarUsuarioLogado, excluirProspeccao, listarProspeccoes,
} from '@/features/prospeccao/services/prospeccao-service';

const moeda = (v: number | null) => maskCurrency(Number(v ?? 0));

// Texto do tempo restante até o término
function tempoRestante(fim: string | null, agora: number): { texto: string; urgente: boolean; encerrado: boolean } {
  if (!fim) return { texto: '—', urgente: false, encerrado: false };
  const diff = new Date(fim).getTime() - agora;
  if (diff <= 0) return { texto: 'Encerrado', urgente: false, encerrado: true };
  const min = Math.floor(diff / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const s = Math.floor((diff % 60000) / 1000);
  const texto = d > 0 ? `${d}d ${h}h ${m}min ${s.toString().padStart(2, '0')}s` : h > 0 ? `${h}h ${m}min ${s.toString().padStart(2, '0')}s` : `${m}min ${s.toString().padStart(2, '0')}s`;
  return { texto, urgente: diff < 3 * 60000, encerrado: false };
}

const ProspeccaoList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Em andamento');
  const [filtroPlataforma, setFiltroPlataforma] = useState('todas');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [selecionada, setSelecionada] = useState<Prospeccao | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Prospeccao | null>(null);
  const [agora, setAgora] = useState(Date.now());

  // Atualiza o contador a cada segundo para correr regressivamente
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: prospeccoes = [], isLoading } = useQuery({
    queryKey: ['prospeccoes'],
    queryFn: async () => {
      const usuario = await buscarUsuarioLogado();
      return listarProspeccoes(usuario?.config ?? null);
    },
  });

  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['prospeccoes'] });

  const filtradas = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return prospeccoes.filter((p) => {
      if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false;
      if (filtroPlataforma !== 'todas' && p.plataforma !== filtroPlataforma) return false;
      if (!termo) return true;
      return [p.placa, p.modelo, p.fabricante, p.localizacao].some((v) => v?.toLowerCase().includes(termo));
    });
  }, [prospeccoes, busca, filtroStatus, filtroPlataforma]);

  const handleExcluir = async () => {
    if (!paraExcluir) return;
    try {
      await excluirProspeccao(paraExcluir.id);
      toast({ title: 'Prospecção excluída' });
      recarregar();
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: e instanceof Error ? e.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setParaExcluir(null);
    }
  };

  const abrir = (p: Prospeccao | null) => {
    setSelecionada(p);
    setDialogAberto(true);
  };

  return (
    <div>
      <PageHeader
        title="Prospecção de veículos"
        description="Acompanhe os veículos de interesse nas plataformas e não perca o prazo"
        action={<Button onClick={() => abrir(null)}><Plus className="h-4 w-4 mr-2" />Nova prospecção</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por placa, modelo, fabricante ou local" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_PROSPECCAO.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroPlataforma} onValueChange={setFiltroPlataforma}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as plataformas</SelectItem>
            {PLATAFORMAS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <EmptyState icon={Car} title="Nenhuma prospecção encontrada" description="Cadastre um veículo de interesse para começar." />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Veículo</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Término</TableHead>
                <TableHead className="text-right">Inicial</TableHead>
                <TableHead className="text-right">FIPE</TableHead>
                <TableHead className="text-right">Mercado</TableHead>
                <TableHead className="text-right">Custos</TableHead>
                <TableHead className="text-right">Máximo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((p) => {
                const tempo = tempoRestante(p.data_hora_fim, agora);
                const custos = Number(p.custo_preparacao ?? 0) + Number(p.custo_plataforma ?? 0) + Number(p.custo_documentacao ?? 0);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.foto ? (
                          <img src={p.foto} alt={p.modelo ?? 'Veículo'} className="h-10 w-14 object-cover rounded" />
                        ) : (
                          <div className="h-10 w-14 rounded bg-muted flex items-center justify-center"><Car className="h-4 w-4 text-muted-foreground" /></div>
                        )}
                        <div>
                          <p className="font-medium">{[p.fabricante, p.modelo].filter(Boolean).join(' ') || '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {[p.placa, p.ano_fabricacao && p.ano_modelo ? `${p.ano_fabricacao}/${p.ano_modelo}` : null, p.km ? `${p.km} km` : null].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{p.plataforma ?? '—'}</TableCell>
                    <TableCell>
                      <div className={cn('flex items-center gap-1 text-sm font-medium', tempo.encerrado ? 'text-muted-foreground' : tempo.urgente ? 'text-destructive' : 'text-lime-500')}>
                        <Clock className="h-3.5 w-3.5" />{tempo.texto}
                      </div>
                      {p.data_hora_fim && <p className="text-xs text-muted-foreground">{format(new Date(p.data_hora_fim), 'dd/MM/yyyy HH:mm')}</p>}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{moeda(p.valor_inicial)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{moeda(p.fipe)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{moeda(p.valor_mercado)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{maskCurrency(custos)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap font-semibold text-primary">{moeda(p.valor_maximo)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'Em andamento' ? 'default' : 'secondary'}>{p.status ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {p.link_plataforma && (
                        <Button variant="ghost" size="icon" asChild title="Abrir na plataforma">
                          <a href={p.link_plataforma} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => abrir(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Excluir" onClick={() => setParaExcluir(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ProspeccaoDialog open={dialogAberto} onOpenChange={setDialogAberto} prospeccao={selecionada} onSaved={recarregar} />

      <AlertDialog open={!!paraExcluir} onOpenChange={(o) => !o && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prospecção?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProspeccaoList;
