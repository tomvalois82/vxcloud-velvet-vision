import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload, X, Calculator } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { maskCurrency, unmaskCurrency, maskPlaca, maskKm, maskYear } from '@/features/estoque/utils/masks';
import {
  COMBUSTIVEIS, LAUDOS, PLATAFORMAS, STATUS_PROSPECCAO, TIPOS_VEICULO,
  Prospeccao, PlataformaCompra, buscarUsuarioLogado, enviarArquivo, salvarProspeccao,
} from '../services/prospeccao-service';
import {
  getFipeMarcas, getFipeModelos, getFipeAnos, getFipeValor, parseFipeValor, TipoVeiculo,
} from '@/features/estoque/services/fipeService';

interface OpcaoFipe { codigo: string; nome: string }
const ANO_LIMITE = new Date().getFullYear() + 1;

interface ProspeccaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospeccao: Prospeccao | null;
  onSaved: () => void;
}

interface FormState {
  placa: string; tipo_veiculo: string; fabricante: string; modelo: string;
  ano_fabricacao: string; ano_modelo: string; cor: string; km: string; combustivel: string;
  plataforma: string; margem: string; fipe: string; valor_inicial: string; valor_maximo: string;
  valor_mercado: string; valor_compra: string; custo_preparacao: string; custo_plataforma: string;
  custo_documentacao: string; data_hora_fim: string; localizacao: string; link_plataforma: string;
  observacao: string; laudo: string; laudo_anexo: string; status: string; foto: string;
}

const moeda = (v: number | null | undefined) => maskCurrency(Number(v ?? 0));

// Converte timestamp para o formato do input datetime-local (horário local)
const paraInputDataHora = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const estadoInicial = (p: Prospeccao | null): FormState => ({
  placa: p?.placa ?? '', tipo_veiculo: p?.tipo_veiculo ?? 'carros', fabricante: p?.fabricante ?? '',
  modelo: p?.modelo ?? '', ano_fabricacao: p?.ano_fabricacao ?? '', ano_modelo: p?.ano_modelo ?? '',
  cor: p?.cor ?? '', km: p?.km ? maskKm(p.km) : '', combustivel: p?.combustivel ?? '',
  plataforma: p?.plataforma ?? '', margem: String(p?.margem ?? 0), fipe: moeda(p?.fipe),
  valor_inicial: moeda(p?.valor_inicial), valor_maximo: moeda(p?.valor_maximo),
  valor_mercado: moeda(p?.valor_mercado), valor_compra: moeda(p?.valor_compra),
  custo_preparacao: moeda(p?.custo_preparacao), custo_plataforma: moeda(p?.custo_plataforma),
  custo_documentacao: moeda(p?.custo_documentacao), data_hora_fim: paraInputDataHora(p?.data_hora_fim ?? null),
  localizacao: p?.localizacao ?? '', link_plataforma: p?.link_plataforma ?? '', observacao: p?.observacao ?? '',
  laudo: p?.laudo ?? '', laudo_anexo: p?.laudo_anexo ?? '', status: p?.status ?? 'Em andamento', foto: p?.foto ?? '',
});

export function ProspeccaoDialog({ open, onOpenChange, prospeccao, onSaved }: ProspeccaoDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(estadoInicial(null));
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState<'foto' | 'laudo' | null>(null);

  useEffect(() => {
    if (open) setForm(estadoInicial(prospeccao));
  }, [open, prospeccao]);

  const set = (campo: keyof FormState, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  // Referência estável do toast para não reexecutar a consulta FIPE a cada renderização
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Dados da FIPE
  const [marcas, setMarcas] = useState<OpcaoFipe[]>([]);
  const [modelos, setModelos] = useState<OpcaoFipe[]>([]);
  const [anosFipe, setAnosFipe] = useState<OpcaoFipe[]>([]);
  const [carregandoFipe, setCarregandoFipe] = useState(false);
  const [alteradoPeloUsuario, setAlteradoPeloUsuario] = useState(false);

  const tipoFipe = (form.tipo_veiculo || 'carros') as TipoVeiculo;
  const codigoMarca = marcas.find((m) => m.nome === form.fabricante)?.codigo ?? '';
  const codigoModelo = modelos.find((m) => m.nome === form.modelo)?.codigo ?? '';

  useEffect(() => { if (open) setAlteradoPeloUsuario(false); }, [open]);

  // Carrega fabricantes conforme o tipo de veículo
  useEffect(() => {
    if (!open) return;
    getFipeMarcas(tipoFipe)
      .then((d) => setMarcas(d.map((m) => ({ codigo: String(m.codigo), nome: m.nome }))))
      .catch(() => setMarcas([]));
  }, [open, tipoFipe]);

  // Carrega modelos do fabricante selecionado
  useEffect(() => {
    setModelos([]);
    if (!codigoMarca) return;
    getFipeModelos(codigoMarca, tipoFipe)
      .then((d) => setModelos(d.modelos.map((m) => ({ codigo: String(m.codigo), nome: m.nome }))))
      .catch(() => setModelos([]));
  }, [codigoMarca, tipoFipe]);

  // Carrega anos do modelo selecionado
  useEffect(() => {
    setAnosFipe([]);
    if (!codigoMarca || !codigoModelo) return;
    getFipeAnos(codigoMarca, codigoModelo, tipoFipe)
      .then((d) => setAnosFipe(d.map((a) => ({ codigo: a.codigo, nome: a.nome }))))
      .catch(() => setAnosFipe([]));
  }, [codigoMarca, codigoModelo, tipoFipe]);

  // Preenche o valor FIPE quando fabricante, modelo e ano modelo estiverem definidos
  useEffect(() => {
    if (!alteradoPeloUsuario || !codigoMarca || !codigoModelo || !form.ano_modelo || anosFipe.length === 0) return;
    const ano = anosFipe.find((a) => a.codigo.startsWith(`${form.ano_modelo}-`))
      ?? (Number(form.ano_modelo) >= new Date().getFullYear() ? anosFipe.find((a) => a.codigo.startsWith('32000-')) : undefined);
    if (!ano) {
      toastRef.current({ title: 'Ano não encontrado na FIPE', description: 'Este modelo não possui valor FIPE para o ano selecionado.' });
      return;
    }
    let ativo = true;
    setCarregandoFipe(true);
    getFipeValor(codigoMarca, codigoModelo, ano.codigo, tipoFipe)
      .then((v) => { if (ativo) setForm((f) => ({ ...f, fipe: maskCurrency(parseFipeValor(v.Valor)) })); })
      .catch(() => toastRef.current({ title: 'Não foi possível consultar a FIPE', variant: 'destructive' }))
      .finally(() => { if (ativo) setCarregandoFipe(false); });
    return () => { ativo = false; };
  }, [alteradoPeloUsuario, codigoMarca, codigoModelo, form.ano_modelo, anosFipe, tipoFipe]);

  // Anos de modelo: do mais antigo da FIPE até o ano atual + 1
  const anosDisponiveis = (() => {
    const anosNumericos = anosFipe.map((a) => Number(a.codigo.split('-')[0])).filter((n) => n > 1900 && n < 32000);
    const inicio = anosNumericos.length ? Math.min(...anosNumericos) : 1950;
    const lista: string[] = [];
    for (let a = ANO_LIMITE; a >= inicio; a--) lista.push(String(a));
    if (form.ano_modelo && !lista.includes(form.ano_modelo)) lista.push(form.ano_modelo);
    return lista;
  })();

  const alterarFipe = (campo: 'tipo_veiculo' | 'fabricante' | 'modelo' | 'ano_modelo', valor: string) => {
    setAlteradoPeloUsuario(true);
    setForm((f) => {
      const novo = { ...f, [campo]: valor };
      if (campo === 'tipo_veiculo') { novo.fabricante = ''; novo.modelo = ''; }
      if (campo === 'fabricante') novo.modelo = '';
      if (campo === 'ano_modelo' && !f.ano_fabricacao) novo.ano_fabricacao = valor;
      return novo;
    });
  };

  const selectFipe = (
    campo: 'tipo_veiculo' | 'fabricante' | 'modelo' | 'ano_modelo', rotulo: string,
    opcoes: { value: string; label: string }[], desabilitado = false,
  ) => {
    const valor = form[campo];
    const lista = valor && !opcoes.some((o) => o.value === valor) ? [{ value: valor, label: valor }, ...opcoes] : opcoes;
    return (
      <div className="space-y-1.5">
        <Label>{rotulo}</Label>
        <Select value={valor || undefined} onValueChange={(v) => alterarFipe(campo, v)} disabled={desabilitado}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {lista.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const custosTotais =
    unmaskCurrency(form.custo_preparacao) + unmaskCurrency(form.custo_plataforma) + unmaskCurrency(form.custo_documentacao);

  // Valor máximo = valor de mercado - margem (%) - custos
  const calcularValorMaximo = () => {
    const mercado = unmaskCurrency(form.valor_mercado);
    const margem = Number(form.margem.replace(',', '.')) || 0;
    const maximo = Math.max(mercado * (1 - margem / 100) - custosTotais, 0);
    set('valor_maximo', maskCurrency(maximo));
  };

  const handleUpload = async (arquivo: File | undefined, tipo: 'foto' | 'laudo') => {
    if (!arquivo) return;
    setEnviando(tipo);
    try {
      const url = await enviarArquivo(arquivo, tipo === 'foto' ? 'fotos' : 'laudos');
      set(tipo === 'foto' ? 'foto' : 'laudo_anexo', url);
    } catch (e) {
      toast({ title: 'Erro no envio', description: e instanceof Error ? e.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setEnviando(null);
    }
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const usuario = await buscarUsuarioLogado();
      const texto = (v: string) => (v.trim() ? v.trim() : null);
      await salvarProspeccao(
        {
          placa: texto(form.placa), tipo_veiculo: form.tipo_veiculo || 'carros', fabricante: texto(form.fabricante),
          modelo: texto(form.modelo), ano_fabricacao: texto(form.ano_fabricacao), ano_modelo: texto(form.ano_modelo),
          cor: texto(form.cor), km: texto(form.km.replace(/\D/g, '')), combustivel: texto(form.combustivel),
          plataforma: (form.plataforma || null) as PlataformaCompra | null,
          margem: Number(form.margem.replace(',', '.')) || 0, fipe: unmaskCurrency(form.fipe),
          valor_inicial: unmaskCurrency(form.valor_inicial), valor_maximo: unmaskCurrency(form.valor_maximo),
          valor_mercado: unmaskCurrency(form.valor_mercado), valor_compra: unmaskCurrency(form.valor_compra),
          custo_preparacao: unmaskCurrency(form.custo_preparacao), custo_plataforma: unmaskCurrency(form.custo_plataforma),
          custo_documentacao: unmaskCurrency(form.custo_documentacao),
          data_hora_fim: form.data_hora_fim ? new Date(form.data_hora_fim).toISOString() : null,
          localizacao: texto(form.localizacao), link_plataforma: texto(form.link_plataforma),
          observacao: texto(form.observacao), laudo: texto(form.laudo), laudo_anexo: texto(form.laudo_anexo),
          status: texto(form.status), foto: texto(form.foto),
          ...(prospeccao ? {} : { config: usuario?.config ?? null, usuario: usuario?.id ?? null }),
        },
        prospeccao?.id,
      );
      toast({ title: prospeccao ? 'Prospecção atualizada' : 'Prospecção cadastrada' });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e instanceof Error ? e.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const campoMoeda = (campo: keyof FormState, rotulo: string) => (
    <div className="space-y-1.5">
      <Label>{rotulo}</Label>
      <Input value={form[campo]} onChange={(e) => set(campo, maskCurrency(e.target.value))} />
    </div>
  );

  const campoSelect = (campo: keyof FormState, rotulo: string, opcoes: { value: string; label: string }[]) => (
    <div className="space-y-1.5">
      <Label>{rotulo}</Label>
      <Select value={form[campo] || undefined} onValueChange={(v) => set(campo, v)}>
        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent>
          {opcoes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const op = (lista: string[]) => lista.map((v) => ({ value: v, label: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{prospeccao ? 'Editar prospecção' : 'Nova prospecção'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Veículo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Placa</Label>
                <Input value={form.placa} placeholder="AAA-9A99" onChange={(e) => set('placa', maskPlaca(e.target.value))} />
              </div>
              {selectFipe('tipo_veiculo', 'Tipo de veículo', TIPOS_VEICULO)}
              {selectFipe('fabricante', 'Fabricante', marcas.map((m) => ({ value: m.nome, label: m.nome })), marcas.length === 0)}
              {selectFipe('modelo', 'Modelo', modelos.map((m) => ({ value: m.nome, label: m.nome })), !form.fabricante)}
              {selectFipe('ano_modelo', 'Ano modelo', anosDisponiveis.map((a) => ({ value: a, label: a })))}
              <div className="space-y-1.5"><Label>Ano fabricação</Label><Input value={form.ano_fabricacao} onChange={(e) => set('ano_fabricacao', maskYear(e.target.value))} /></div>
              <div className="space-y-1.5"><Label>Cor</Label><Input value={form.cor} onChange={(e) => set('cor', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>KM</Label><Input value={form.km} onChange={(e) => set('km', maskKm(e.target.value))} /></div>
              {campoSelect('combustivel', 'Combustível', op(COMBUSTIVEIS))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Valores e custos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {campoSelect('plataforma', 'Plataforma', op(PLATAFORMAS))}
              <div className="space-y-1.5">
                <Label>Margem (%)</Label>
                <Input value={form.margem} inputMode="decimal" onChange={(e) => set('margem', e.target.value.replace(/[^\d.,]/g, ''))} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">FIPE {carregandoFipe && <Loader2 className="h-3 w-3 animate-spin" />}</Label>
                <Input value={form.fipe} onChange={(e) => set('fipe', maskCurrency(e.target.value))} />
              </div>
              {campoMoeda('valor_inicial', 'Valor inicial')}
              <div className="space-y-1.5">
                <Label>Valor máximo</Label>
                <div className="flex gap-2">
                  <Input value={form.valor_maximo} onChange={(e) => set('valor_maximo', maskCurrency(e.target.value))} />
                  <Button type="button" variant="outline" size="icon" title="Calcular pelo mercado, margem e custos" onClick={calcularValorMaximo}>
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {campoMoeda('valor_mercado', 'Valor de mercado')}
              {campoMoeda('valor_compra', 'Valor de compra')}
              {campoMoeda('custo_preparacao', 'Custo de preparação')}
              {campoMoeda('custo_plataforma', 'Custo da plataforma')}
              {campoMoeda('custo_documentacao', 'Custo de documentação')}
              <div className="space-y-1.5">
                <Label>Total de custos</Label>
                <Input value={maskCurrency(custosTotais)} disabled />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Negociação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Data/hora de término</Label><Input type="datetime-local" value={form.data_hora_fim} onChange={(e) => set('data_hora_fim', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Localização</Label><Input value={form.localizacao} onChange={(e) => set('localizacao', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Link da plataforma</Label><Input value={form.link_plataforma} placeholder="https://" onChange={(e) => set('link_plataforma', e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Observação</Label><Textarea value={form.observacao} onChange={(e) => set('observacao', e.target.value)} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {campoSelect('laudo', 'Laudo', op(LAUDOS))}
              <div className="space-y-1.5">
                <Label>Anexo do laudo</Label>
                {form.laudo_anexo ? (
                  <div className="flex items-center gap-2">
                    <a href={form.laudo_anexo} target="_blank" rel="noreferrer" className="text-sm text-primary underline truncate">Ver anexo</a>
                    <Button type="button" variant="ghost" size="icon" onClick={() => set('laudo_anexo', '')}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full" asChild disabled={enviando === 'laudo'}>
                    <label className="cursor-pointer">
                      {enviando === 'laudo' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Enviar documento ou imagem
                      <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0], 'laudo')} />
                    </label>
                  </Button>
                )}
              </div>
              {campoSelect('status', 'Status', op(STATUS_PROSPECCAO))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Foto</h3>
            {form.foto ? (
              <div className="relative w-48">
                <img src={form.foto} alt="Foto do veículo" className="w-48 h-32 object-cover rounded-md border border-border" />
                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => set('foto', '')}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" asChild disabled={enviando === 'foto'}>
                <label className="cursor-pointer">
                  {enviando === 'foto' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Enviar foto
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0], 'foto')} />
                </label>
              </Button>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvando || enviando !== null}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
