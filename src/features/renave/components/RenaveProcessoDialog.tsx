import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, ExternalLink, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { maskCurrency, unmaskCurrency } from '@/features/estoque/utils/masks';
import {
  buscarDocumentosRenave, buscarPessoasRenave, buscarProcesso, buscarProcessoOutroAmbiente,
  buscarUltimoCancelado, buscarVeiculoRenave, buscarVendaDoCiclo, excluirProcesso,
  caminhoDoLinkRenave, executarAcaoRenave, iniciarProcesso, mensagemErroRenave,
  salvarCrvSaida, salvarEntrada, salvarSaida, type RespostaAcaoRenave,
} from '../services/renave-service';
import { CHAVE_PODE_GERENCIAR, podeGerenciarCertificado } from '../certificado-service';
import { useRenaveConfig } from '../hooks/use-renave-habilitado';
import { PASSOS_RENAVE, infoEtapa, passoAtual } from '../utils/etapas';
import { pendenciasEntrada, pendenciasSaida } from '../utils/pendencias';
import { RenaveEtapaBadge } from './RenaveEtapaBadge';
import { RenaveAmbienteBadge } from './RenaveAmbienteBadge';
import { PessoaRenaveSelect } from './PessoaRenaveSelect';
import { formatarDocumento } from '../utils/documento';
import { abrirDocumentoRenave } from '../utils/abrir-documento';

const MOTIVOS = ['Venda financiada', 'Exigência do comprador', 'Outro'];
const TIPOS_CRV = [
  { valor: 'AZUL', rotulo: 'Azul' },
  { valor: 'VERDE', rotulo: 'Verde' },
  { valor: 'BRANCO', rotulo: 'Branco' },
  { valor: 'DIGITAL', rotulo: 'Digital' },
] as const;
const TAMANHO_MAX_FOTO = 5 * 1024 * 1024;

interface Props {
  idEstoque: number | null | undefined;
  aberto: boolean;
  onFechar: () => void;
}

// Converte timestamptz para o formato do input datetime-local (horário local).
function paraDataHoraLocal(valor: string | null): string {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

function formatarDataHora(valor: string | null | undefined): string {
  if (!valor) return '';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? '' : data.toLocaleString('pt-BR');
}

const moeda = (valor: number | null | undefined) => (valor !== null && valor !== undefined ? maskCurrency(Number(valor)) : '');
const moedaBrasil = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatarChaveNfe = (chave: string | null | undefined) => (chave || '').replace(/(\d{4})(?=\d)/g, '$1 ');

function lerArquivoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('Não foi possível ler a foto selecionada.'));
    leitor.readAsDataURL(arquivo);
  });
}

function valorDebito(debitos: Record<string, unknown>, chaves: string[]): number | null {
  for (const chave of chaves) {
    const valor = debitos[chave];
    if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
    if (typeof valor === 'string' && valor.trim()) {
      const numero = Number(valor.replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(numero)) return numero;
    }
    if (valor && typeof valor === 'object' && 'valor' in valor) {
      const aninhado = (valor as { valor: unknown }).valor;
      if (typeof aninhado === 'number' && Number.isFinite(aninhado)) return aninhado;
    }
  }
  return null;
}

function textoMotivo(motivo: unknown): string {
  if (typeof motivo === 'string') return motivo;
  if (motivo && typeof motivo === 'object') {
    const registro = motivo as Record<string, unknown>;
    const texto = registro.motivo ?? registro.mensagem ?? registro.descricao;
    if (typeof texto === 'string') return texto;
  }
  return JSON.stringify(motivo);
}

interface BotaoAcaoProps {
  acao: string;
  processando: string | null;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'destructive';
}

function BotaoAcao({ acao, processando, onClick, children, disabled = false, variant = 'outline' }: BotaoAcaoProps) {
  return (
    <Button type="button" variant={variant} size="sm" onClick={onClick} disabled={disabled || processando !== null}>
      {processando === acao && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

function ListaPendencias({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) {
    return <p className="flex items-center gap-2 text-sm text-green-500"><Check className="h-4 w-4" /> Nenhuma pendência encontrada.</p>;
  }
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
      <p className="mb-1 text-sm font-medium text-amber-500">{titulo}</p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
        {itens.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

interface BlocoNfeProps {
  titulo: string;
  acao: string;
  processando: string | null;
  chave: string;
  onChave: (valor: string) => void;
  onEnviar: () => void;
  chaveEnviada: string | null;
  enviadaEm: string | null;
}

function BlocoNfe({ titulo, acao, processando, chave, onChave, onEnviar, chaveEnviada, enviadaEm }: BlocoNfeProps) {
  return (
    <section className="space-y-3 rounded-md border border-border/50 p-3">
      <h3 className="text-sm font-medium">{titulo}</h3>
      {enviadaEm ? (
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2 text-green-500"><Check className="h-4 w-4" /> Enviada em {formatarDataHora(enviadaEm)}</p>
          <p className="break-all text-xs text-muted-foreground">{formatarChaveNfe(chaveEnviada)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Chave da NF-e (44 dígitos)</Label>
          <Input
            inputMode="numeric"
            maxLength={54}
            value={chave}
            onChange={(evento) => onChave(evento.target.value.replace(/\D/g, '').slice(0, 44))}
            placeholder="Cole a chave com ou sem espaços"
            disabled={processando !== null}
          />
          <BotaoAcao acao={acao} processando={processando} onClick={onEnviar} disabled={chave.length !== 44}>
            {`Enviar ${titulo}`}
          </BotaoAcao>
        </div>
      )}
    </section>
  );
}

interface ResultadoAptidao {
  apto: boolean;
  motivos: unknown[];
  debitos: Record<string, unknown> | null;
}

export function RenaveProcessoDialog({ idEstoque, aberto, onFechar }: Props) {
  const queryClient = useQueryClient();
  const habilitado = aberto && !!idEstoque;
  const { data: config } = useRenaveConfig();

  const processoQuery = useQuery({
    queryKey: ['renave-processo', idEstoque],
    queryFn: () => buscarProcesso(idEstoque as number),
    enabled: habilitado,
  });
  const outroAmbienteQuery = useQuery({
    queryKey: ['renave-processo-outro', idEstoque],
    queryFn: () => buscarProcessoOutroAmbiente(idEstoque as number),
    enabled: habilitado,
  });
  const veiculoQuery = useQuery({
    queryKey: ['renave-veiculo', idEstoque],
    queryFn: () => buscarVeiculoRenave(idEstoque as number),
    enabled: habilitado,
  });
  const pessoasQuery = useQuery({ queryKey: ['renave-pessoas'], queryFn: buscarPessoasRenave, enabled: aberto });
  const vendaQuery = useQuery({
    queryKey: ['renave-venda', idEstoque],
    queryFn: () => buscarVendaDoCiclo(idEstoque as number),
    enabled: habilitado,
  });
  const permissaoQuery = useQuery({ queryKey: CHAVE_PODE_GERENCIAR, queryFn: podeGerenciarCertificado, enabled: aberto });

  const processo = processoQuery.data ?? null;
  const pessoas = useMemo(() => pessoasQuery.data ?? [], [pessoasQuery.data]);
  const veiculo = veiculoQuery.data ?? null;
  const idProcesso = processo?.id ?? null;

  const canceladoQuery = useQuery({
    queryKey: ['renave-ultimo-cancelado', idEstoque],
    queryFn: () => buscarUltimoCancelado(idEstoque as number),
    enabled: habilitado && processoQuery.isSuccess && !processo,
  });
  // Documentos do processo ativo ou, sem ele, do último processo cancelado (histórico)
  const idProcessoDocumentos = idProcesso ?? canceladoQuery.data?.id ?? null;
  const documentosQuery = useQuery({
    queryKey: ['renave-documentos', idProcessoDocumentos],
    queryFn: () => buscarDocumentosRenave(idProcessoDocumentos as string),
    enabled: aberto && !!idProcessoDocumentos,
  });

  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [confirmarInicio, setConfirmarInicio] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [confirmarEntrada, setConfirmarEntrada] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [confirmarCancelarEntrada, setConfirmarCancelarEntrada] = useState(false);
  const [confirmarCancelarSaida, setConfirmarCancelarSaida] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [processando, setProcessando] = useState<string | null>(null);

  // Formulário de entrada
  const [proprietario, setProprietario] = useState<string | null>(null);
  const [dataEntrada, setDataEntrada] = useState('');
  const [valorEntrada, setValorEntrada] = useState('');
  const [km, setKm] = useState('');
  const [dataMedicao, setDataMedicao] = useState('');
  const [tipoCrv, setTipoCrv] = useState('');
  const [numeroCrv, setNumeroCrv] = useState('');
  const [codigoSeguranca, setCodigoSeguranca] = useState('');
  const [substituirCodigo, setSubstituirCodigo] = useState(false);
  const [emailVendedor, setEmailVendedor] = useState('');
  const [entradaSuja, setEntradaSuja] = useState(false);
  // Formulário de saída
  const [comprador, setComprador] = useState<string | null>(null);
  const [dataSaida, setDataSaida] = useState('');
  const [valorSaida, setValorSaida] = useState('');
  const [numeroCrvSaida, setNumeroCrvSaida] = useState('');
  const [codigoSegurancaSaida, setCodigoSegurancaSaida] = useState('');
  const [substituirCodigoSaida, setSubstituirCodigoSaida] = useState(false);
  const [saidaSuja, setSaidaSuja] = useState(false);

  const [resultadoAptidao, setResultadoAptidao] = useState<ResultadoAptidao | null>(null);
  const [fotoAssinatura, setFotoAssinatura] = useState<File | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [chaveNfEntrada, setChaveNfEntrada] = useState('');
  const [chaveNfSaida, setChaveNfSaida] = useState('');

  // Preenche os formulários sempre que o processo é (re)carregado.
  useEffect(() => {
    if (!processo) return;
    const venda = vendaQuery.data;
    setProprietario(processo.id_pessoa_proprietario_crv);
    setDataEntrada(processo.data_entrada ?? '');
    setValorEntrada(moeda(processo.valor_entrada));
    setKm(processo.km_entrada !== null ? String(processo.km_entrada) : '');
    setDataMedicao(paraDataHoraLocal(processo.data_medicao_hodometro));
    setTipoCrv(processo.tipo_crv?.toUpperCase() ?? '');
    setNumeroCrv(processo.numero_crv ?? '');
    setCodigoSeguranca('');
    setSubstituirCodigo(false);
    setEmailVendedor(processo.email_vendedor ?? '');
    setComprador(processo.id_pessoa_comprador ?? venda?.id_cliente ?? null);
    setDataSaida(processo.data_saida ?? (venda?.data_venda ? venda.data_venda.slice(0, 10) : ''));
    setValorSaida(moeda(processo.valor_saida ?? venda?.valor_total_venda));
    setNumeroCrvSaida(processo.numero_crv_saida ?? '');
    setCodigoSegurancaSaida('');
    setSubstituirCodigoSaida(false);
    setEntradaSuja(false);
    setSaidaSuja(false);
    if (processo.motivo) setMotivo(processo.motivo);
  }, [processo, vendaQuery.data]);

  useEffect(() => {
    setResultadoAptidao(null);
    setFotoAssinatura(null);
    setChaveNfEntrada('');
    setChaveNfSaida('');
  }, [aberto, idEstoque]);

  const recarregar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['renave-processo', idEstoque] }),
      queryClient.invalidateQueries({ queryKey: ['renave-processo-outro', idEstoque] }),
      queryClient.invalidateQueries({ queryKey: ['renave-ultimo-cancelado', idEstoque] }),
      queryClient.invalidateQueries({ queryKey: ['renave-documentos'] }),
      queryClient.invalidateQueries({ queryKey: ['renave-etapas'] }),
    ]);
  };

  const executarLocal = async (acao: string, operacao: () => Promise<void>, sucesso: string, falha: string) => {
    setProcessando(acao);
    try {
      await operacao();
      toast({ title: sucesso });
      await recarregar();
    } catch (error) {
      toast({ title: falha, description: mensagemErroRenave(error, falha), variant: 'destructive' });
    } finally {
      setProcessando(null);
    }
  };

  // Executa uma operação real e sempre recarrega o processo, inclusive após erro.
  const rodar = async (
    acao: string,
    dados: Record<string, unknown>,
    textoSucesso: string,
    antes?: () => Promise<void>,
  ): Promise<RespostaAcaoRenave | null> => {
    setProcessando(acao);
    try {
      if (antes) await antes();
      const resposta = await executarAcaoRenave(acao, dados);
      toast({ title: resposta.mensagem ?? textoSucesso });
      if (resposta.url) {
        const caminho = caminhoDoLinkRenave(resposta.url);
        if (caminho) {
          try {
            await abrirDocumentoRenave(caminho);
          } catch {
            toast({ title: 'Documento gerado, mas não foi possível abri-lo. Use a lista de Documentos abaixo.' });
          }
        }
      }
      await recarregar();
      return resposta;
    } catch (error) {
      toast({
        title: 'Operação RENAVE não concluída',
        description: mensagemErroRenave(error, 'Não foi possível concluir a operação RENAVE.'),
        variant: 'destructive',
      });
      await recarregar();
      return null;
    } finally {
      setProcessando(null);
    }
  };

  const persistirEntrada = async () => {
    if (!idProcesso) throw new Error('Processo RENAVE não encontrado.');
    await salvarEntrada(idProcesso, {
      id_pessoa_proprietario_crv: proprietario,
      data_entrada: dataEntrada || null,
      valor_entrada: valorEntrada ? unmaskCurrency(valorEntrada) : null,
      km_entrada: km ? Number.parseInt(km, 10) : null,
      data_medicao_hodometro: dataMedicao ? new Date(dataMedicao).toISOString() : null,
      email_vendedor: emailVendedor.trim() || null,
      tipo_crv: tipoCrv || null,
      numero_crv: numeroCrv || null,
      codigo_seguranca_crv: codigoSeguranca,
      motivo,
    });
    setEntradaSuja(false);
  };

  const persistirSaida = async () => {
    if (!idProcesso) throw new Error('Processo RENAVE não encontrado.');
    await salvarSaida(idProcesso, {
      id_pessoa_comprador: comprador,
      data_saida: dataSaida || null,
      valor_saida: valorSaida ? unmaskCurrency(valorSaida) : null,
      id_venda: processo?.id_venda ?? vendaQuery.data?.id ?? null,
    });
    await salvarCrvSaida(idProcesso, {
      numero_crv_saida: numeroCrvSaida || null,
      codigo_seguranca_crv_saida: codigoSegurancaSaida,
    });
    setSaidaSuja(false);
  };

  const prepararEntrada = async () => {
    if (entradaSuja) await persistirEntrada();
  };
  const prepararSaida = async () => {
    if (saidaSuja) await persistirSaida();
  };

  const handleIniciar = () => {
    setConfirmarInicio(false);
    if (!idEstoque) return;
    void executarLocal('iniciar', async () => { await iniciarProcesso(idEstoque, motivo); }, 'Processo RENAVE iniciado', 'Não foi possível iniciar o RENAVE');
  };

  const handleExcluir = () => {
    setConfirmarExclusao(false);
    if (!idProcesso) return;
    void executarLocal('excluir', () => excluirProcesso(idProcesso), 'Processo RENAVE excluído', 'Não foi possível excluir o processo');
  };

  const consultarAptidao = async () => {
    if (!idProcesso) return;
    const resposta = await rodar('aptidao', { id_processo: idProcesso }, 'Aptidão consultada', prepararEntrada);
    if (resposta) {
      setResultadoAptidao({ apto: resposta.apto === true, motivos: resposta.motivos ?? [], debitos: resposta.debitos ?? null });
    }
  };

  const enviarFotoAssinatura = async () => {
    if (!idProcesso || !fotoAssinatura) return;
    if (!['image/jpeg', 'image/png'].includes(fotoAssinatura.type)) {
      toast({ title: 'Selecione uma foto JPG ou PNG.', variant: 'destructive' });
      return;
    }
    if (fotoAssinatura.size > TAMANHO_MAX_FOTO) {
      toast({ title: 'A foto deve ter no máximo 5 MB.', variant: 'destructive' });
      return;
    }
    try {
      const fotoBase64 = await lerArquivoDataUrl(fotoAssinatura);
      const resposta = await rodar('assinatura', { id_processo: idProcesso, foto_base64: fotoBase64 }, 'Assinatura do vendedor enviada');
      if (resposta) {
        setFotoAssinatura(null);
        if (inputFotoRef.current) inputFotoRef.current.value = '';
      }
    } catch (error) {
      toast({ title: mensagemErroRenave(error, 'Não foi possível ler a foto.'), variant: 'destructive' });
    }
  };

  const abrirDocumento = async (id: string, storagePath: string, forcarDownload = false) => {
    setProcessando(`documento-${id}`);
    try {
      await abrirDocumentoRenave(storagePath, forcarDownload);
    } catch (error) {
      toast({ title: 'Não foi possível abrir o documento', description: mensagemErroRenave(error, 'Verifique sua permissão de leitura no bucket renave-docs.'), variant: 'destructive' });
    } finally {
      setProcessando(null);
    }
  };

  const entradaEditavel = !!processo && processo.renave_id_estoque === null;
  const saidaEditavel = !!processo && processo.saida_em === null;
  const pessoaProprietario = pessoas.find((p) => p.id === proprietario) ?? null;
  const pessoaComprador = pessoas.find((p) => p.id === comprador) ?? null;
  const temCodigo = processo?.tem_codigo_seguranca === true;
  const temCodigoSaida = processo?.tem_codigo_seguranca_saida === true;

  const pendEntrada = pendenciasEntrada({
    proprietario: pessoaProprietario,
    renavam: veiculo?.renavam ?? null,
    chassi: veiculo?.chassi ?? null,
    tipoCrv,
    numeroCrv,
    temCodigoSeguranca: temCodigo || codigoSeguranca.replace(/\D/g, '').length > 0,
    km,
    dataMedicao,
    valor: valorEntrada ? unmaskCurrency(valorEntrada) : null,
    data: dataEntrada,
    emailEstabelecimento: config?.email ?? null,
  });
  const pendSaida = pendenciasSaida(pessoaComprador, {
    data: dataSaida,
    valor: valorSaida ? unmaskCurrency(valorSaida) : null,
  });

  const erro = processo?.ultimo_erro as { mensagemParaUsuarioFinal?: string; detalhe?: string } | null | undefined;
  const mensagemErro = erro ? (erro.mensagemParaUsuarioFinal ?? erro.detalhe) : null;
  const passo = passoAtual(processo?.etapa);
  const ambienteExibido = processo ? processo.ambiente : (config?.ambiente ?? 'homologacao');
  const outroProcesso = outroAmbienteQuery.data ?? null;
  const ultimoCancelado = canceladoQuery.data ?? null;
  const carregando = processoQuery.isLoading || veiculoQuery.isLoading;
  const podeGerenciar = permissaoQuery.data === true;
  const debitos = resultadoAptidao?.debitos ?? null;
  const documentos = documentosQuery.data ?? [];
  const secaoDocumentos = (
                <section className="space-y-3 rounded-md border border-border/50 p-3">
                  <h3 className="flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4" /> Documentos</h3>
                  {documentosQuery.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  ) : documentosQuery.error ? (
                    <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{mensagemErroRenave(documentosQuery.error, 'Não foi possível listar os documentos.')}</AlertDescription></Alert>
                  ) : documentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum documento gerado para este processo.</p>
                  ) : (
                    <ul className="divide-y divide-border/50">
                      {documentos.map((documento) => (
                        <li key={documento.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                          <div>
                            <p className="font-medium">{documento.tipo.replace(/_/g, ' ')}{documento.numero ? ` · ${documento.numero}` : ''}</p>
                            <p className="text-xs text-muted-foreground">{formatarDataHora(documento.created_at)}</p>
                          </div>
                          <BotaoAcao acao={`documento-${documento.id}`} processando={processando} onClick={() => { void abrirDocumento(documento.id, documento.storage_path, documento.tipo === 'XML_ATPVE'); }}>
                            <ExternalLink className="mr-2 h-4 w-4" /> {documento.tipo === 'XML_ATPVE' ? 'Baixar' : 'Abrir'}
                          </BotaoAcao>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
  );

  return (
    <>
      <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar(); }}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              Processo RENAVE
              {processo && <RenaveEtapaBadge etapa={processo.etapa} mostrarFora />}
              <RenaveAmbienteBadge ambiente={ambienteExibido} />
            </DialogTitle>
            {!processo && !carregando && (
              <p className="text-xs text-muted-foreground">O processo será iniciado neste ambiente.</p>
            )}
            {veiculo && (
              <p className="text-sm text-muted-foreground">
                {[veiculo.fabricante, veiculo.modelo].filter(Boolean).join(' ')} {veiculo.placa ? `| ${veiculo.placa}` : ''}
              </p>
            )}
          </DialogHeader>

          <div className="-mx-6 flex-1 overflow-y-auto px-6">
            {ambienteExibido === 'homologacao' && (
              <Alert className="mb-2 border-amber-500/40 text-amber-500">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Ambiente de HOMOLOGAÇÃO: as operações são testes no Serpro e não têm validade junto ao Detran.</AlertDescription>
              </Alert>
            )}
            {carregando ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
            ) : !processo ? (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Este veículo está <strong className="text-foreground">fora do RENAVE</strong>. O RENAVE é opcional e normalmente é usado em vendas financiadas.
                </p>
                <div className="max-w-xs space-y-2">
                  <Label>Motivo</Label>
                  <Select value={motivo} onValueChange={setMotivo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MOTIVOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {outroProcesso && (
                  <p className="rounded-md border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">
                    {outroProcesso.ambiente === 'homologacao'
                      ? `Este veículo tem um processo de teste em homologação (etapa ${infoEtapa(outroProcesso.etapa).rotulo}). Ele não vale em produção.`
                      : `Este veículo tem um processo real em produção (etapa ${infoEtapa(outroProcesso.etapa).rotulo}), que não aparece enquanto a empresa estiver em homologação.`}
                  </p>
                )}
                {ultimoCancelado && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Último processo cancelado em {formatarDataHora(ultimoCancelado.cancelada_em) || 'data não informada'}: {ultimoCancelado.motivo_cancelamento || 'motivo não informado'}
                    </AlertDescription>
                  </Alert>
                )}
                {ultimoCancelado && secaoDocumentos}
                <BotaoAcao acao="iniciar" processando={processando} onClick={() => setConfirmarInicio(true)} variant="default">
                  Iniciar RENAVE
                </BotaoAcao>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {mensagemErro && (
                  <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{mensagemErro}</AlertDescription></Alert>
                )}

                <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {PASSOS_RENAVE.map((nome, indice) => {
                    const concluido = passo > indice;
                    const atual = passo === indice;
                    return (
                      <li key={nome} className={cn('flex items-center gap-2 rounded-md border p-2 text-xs',
                        atual ? 'border-accent bg-accent/10 text-foreground' : concluido ? 'border-green-500/40 text-green-500' : 'border-border text-muted-foreground')}>
                        <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
                          atual ? 'border-accent' : concluido ? 'border-green-500' : 'border-border')}>
                          {concluido ? <Check className="h-3 w-3" /> : indice + 1}
                        </span>
                        <span className="leading-tight">{nome}</span>
                      </li>
                    );
                  })}
                </ol>

                <div className="space-y-2 rounded-md border border-border/50 bg-muted/20 p-3">
                  <BotaoAcao
                    acao="sincronizar"
                    processando={processando}
                    onClick={() => { if (idProcesso) void rodar('sincronizar', { id_processo: idProcesso }, 'Situação atualizada'); }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Atualizar situação
                  </BotaoAcao>
                  {processo.etapa === 'AGUARDANDO_DETRAN' && (
                    <p className="text-sm text-muted-foreground">Aguardando o Detran confirmar a entrada. Isso pode levar horas ou dias; clique em Atualizar situação para conferir.</p>
                  )}
                </div>

                <Tabs defaultValue="entrada">
                  <TabsList>
                    <TabsTrigger value="entrada">Entrada</TabsTrigger>
                    <TabsTrigger value="saida">Saída</TabsTrigger>
                  </TabsList>

                  <TabsContent value="entrada" className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 rounded-md border border-border/50 bg-muted/20 p-3 text-sm sm:grid-cols-4">
                      <div><p className="text-xs text-muted-foreground">Placa</p><p>{veiculo?.placa || '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">RENAVAM</p><p>{veiculo?.renavam || '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">Chassi</p><p className="break-all">{veiculo?.chassi || '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">Modelo</p><p>{veiculo?.modelo || '—'}</p></div>
                    </div>
                    {(!veiculo?.renavam || !veiculo?.chassi) && (
                      <Alert className="border-amber-500/40 text-amber-500"><AlertTriangle className="h-4 w-4" /><AlertDescription>Complete RENAVAM e chassi no cadastro do veículo</AlertDescription></Alert>
                    )}
                    {!entradaEditavel && <p className="text-sm text-muted-foreground">A entrada já foi comunicada ao RENAVE; os dados estão somente para leitura.</p>}

                    <div className="space-y-2">
                      <Label>Proprietário no CRV</Label>
                      <PessoaRenaveSelect pessoas={pessoas} valor={proprietario} onChange={(valor) => { setProprietario(valor); setEntradaSuja(true); }} disabled={!entradaEditavel} />
                      {pessoaProprietario && <p className="text-xs text-muted-foreground">CPF/CNPJ: {formatarDocumento(pessoaProprietario.cpf_cnpj) || 'não informado'}</p>}
                      <p className="text-xs text-muted-foreground">Deve ser exatamente quem consta no CRV hoje. Pode ser diferente do fornecedor da compra (ex.: o carro foi transferido para uma pessoa da loja).</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Data da entrada</Label>
                        <Input type="date" value={dataEntrada} onChange={(evento) => { setDataEntrada(evento.target.value); setEntradaSuja(true); }} disabled={!entradaEditavel} />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor da entrada</Label>
                        <Input value={valorEntrada} onChange={(evento) => { setValorEntrada(maskCurrency(evento.target.value)); setEntradaSuja(true); }} placeholder="R$ 0,00" disabled={!entradaEditavel} />
                        <p className="text-xs text-muted-foreground">Valor que constará no ATPV-e.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>KM</Label>
                        <Input inputMode="numeric" value={km} onChange={(evento) => { setKm(evento.target.value.replace(/\D/g, '')); setEntradaSuja(true); }} disabled={!entradaEditavel} />
                      </div>
                      <div className="space-y-2">
                        <Label>Data/hora da medição do hodômetro</Label>
                        <Input type="datetime-local" value={dataMedicao} onChange={(evento) => { setDataMedicao(evento.target.value); setEntradaSuja(true); }} disabled={!entradaEditavel} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de CRV</Label>
                        <Select value={tipoCrv} onValueChange={(valor) => { setTipoCrv(valor); setEntradaSuja(true); }} disabled={!entradaEditavel}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{TIPOS_CRV.map((tipo) => <SelectItem key={tipo.valor} value={tipo.valor}>{tipo.rotulo}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nº do CRV *</Label>
                        <Input inputMode="numeric" maxLength={12} value={numeroCrv} onChange={(evento) => { setNumeroCrv(evento.target.value.replace(/\D/g, '').slice(0, 12)); setEntradaSuja(true); }} disabled={!entradaEditavel} />
                      </div>
                      <div className="space-y-2">
                        <Label>Código de segurança do CRV</Label>
                        {temCodigo && !substituirCodigo ? (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-green-500">✓ Código informado</span>
                            {entradaEditavel && <Button type="button" variant="outline" size="sm" disabled={processando !== null} onClick={() => setSubstituirCodigo(true)}>Substituir</Button>}
                          </div>
                        ) : (
                          <Input type="password" autoComplete="new-password" inputMode="numeric" maxLength={11} value={codigoSeguranca}
                            onChange={(evento) => { setCodigoSeguranca(evento.target.value.replace(/\D/g, '').slice(0, 11)); setEntradaSuja(true); }} disabled={!entradaEditavel} placeholder="11 dígitos" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>E-mail do vendedor (opcional)</Label>
                        <Input type="email" value={emailVendedor} onChange={(evento) => { setEmailVendedor(evento.target.value); setEntradaSuja(true); }} disabled={!entradaEditavel} />
                      </div>
                    </div>

                    <ListaPendencias titulo="Pendências para comunicar a entrada" itens={pendEntrada} />

                    <div className="flex flex-wrap gap-2">
                      {entradaEditavel && (
                        <BotaoAcao acao="salvar-entrada" processando={processando} onClick={() => { void executarLocal('salvar-entrada', persistirEntrada, 'Dados da entrada salvos', 'Erro ao salvar a entrada'); }} variant="default">
                          Salvar dados da entrada
                        </BotaoAcao>
                      )}
                      {processo.renave_id_estoque === null && (
                        <>
                          <BotaoAcao acao="aptidao" processando={processando} onClick={() => { void consultarAptidao(); }}>Consultar aptidão</BotaoAcao>
                          <BotaoAcao acao="entrada" processando={processando} onClick={() => setConfirmarEntrada(true)} disabled={pendEntrada.length > 0 || processo.aptidao_apto === false} variant="default">
                            Comunicar entrada
                          </BotaoAcao>
                        </>
                      )}
                    </div>

                    {(resultadoAptidao || processo.aptidao_em) && (
                      <section className="space-y-2 rounded-md border border-border/50 p-3 text-sm">
                        <h3 className="font-medium">Consulta de aptidão</h3>
                        {resultadoAptidao ? (
                          resultadoAptidao.apto ? (
                            <p className="flex items-center gap-2 text-green-500"><Check className="h-4 w-4" /> Apto</p>
                          ) : (
                            <ul className="list-disc space-y-1 pl-5 text-destructive">
                              {resultadoAptidao.motivos.length > 0
                                ? resultadoAptidao.motivos.map((item, indice) => <li key={`${textoMotivo(item)}-${indice}`}>{textoMotivo(item)}</li>)
                                : <li>Veículo não apto.</li>}
                            </ul>
                          )
                        ) : (
                          <p className={processo.aptidao_apto ? 'text-green-500' : 'text-destructive'}>
                            {processo.aptidao_apto ? 'Apto' : 'Não apto'} na última consulta.
                          </p>
                        )}
                        {processo.aptidao_em && <p className="text-xs text-muted-foreground">Último resultado salvo em {formatarDataHora(processo.aptidao_em)}.</p>}
                        {debitos?.existemDebitos === true && (
                          <Alert className="border-amber-500/40 text-amber-500">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <p className="mb-1">Há débitos informados. Eles não impedem a entrada.</p>
                              <ul className="space-y-0.5 text-xs">
                                <li>IPVA: {valorDebito(debitos, ['valorIpva', 'ipva']) !== null ? moedaBrasil.format(valorDebito(debitos, ['valorIpva', 'ipva']) as number) : 'Não informado'}</li>
                                <li>Licenciamento: {valorDebito(debitos, ['valorLicenciamento', 'licenciamento']) !== null ? moedaBrasil.format(valorDebito(debitos, ['valorLicenciamento', 'licenciamento']) as number) : 'Não informado'}</li>
                                <li>Multas: {valorDebito(debitos, ['valorMultas', 'multas']) !== null ? moedaBrasil.format(valorDebito(debitos, ['valorMultas', 'multas']) as number) : 'Não informado'}</li>
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </section>
                    )}

                    {processo.renave_id_estoque !== null && (
                      <div className="grid gap-2 rounded-md border border-border/50 bg-muted/20 p-3 text-sm sm:grid-cols-2">
                        <p><span className="text-muted-foreground">Estoque RENAVE:</span> <strong>{processo.renave_id_estoque}</strong></p>
                        <p><span className="text-muted-foreground">Estado:</span> <strong>{processo.estado || 'Não informado'}</strong></p>
                      </div>
                    )}

                    {processo.renave_id_estoque !== null && (
                      <section className="space-y-3 rounded-md border border-border/50 p-3">
                        <h3 className="text-sm font-medium">Assinatura do vendedor</h3>
                        {processo.assinatura_em ? (
                          <p className="flex items-center gap-2 text-sm text-green-500">
                            <Check className="h-4 w-4" /> Assinatura do vendedor: {processo.assinatura_tipo || 'confirmada'} em {formatarDataHora(processo.assinatura_em)}
                          </p>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <BotaoAcao acao="atpv-entrada" processando={processando} onClick={() => { if (idProcesso) void rodar('atpv', { id_processo: idProcesso }, 'ATPV-e gerado'); }}>
                                Baixar ATPV-e para assinatura
                              </BotaoAcao>
                              <p className="text-xs text-muted-foreground">O vendedor assina o ATPV-e impresso e reconhece firma em cartório. Envie a foto do documento assinado.</p>
                              <Input
                                ref={inputFotoRef}
                                type="file"
                                accept="image/jpeg,image/png"
                                disabled={processando !== null}
                                onChange={(evento: ChangeEvent<HTMLInputElement>) => setFotoAssinatura(evento.target.files?.[0] ?? null)}
                              />
                              <BotaoAcao acao="assinatura" processando={processando} onClick={() => { void enviarFotoAssinatura(); }} disabled={!fotoAssinatura}>
                                Enviar foto assinada
                              </BotaoAcao>
                            </div>
                            <div className="space-y-2 border-t border-border/50 pt-3">
                              <BotaoAcao acao="verificar_assinatura" processando={processando} onClick={() => { if (idProcesso) void rodar('verificar_assinatura', { id_processo: idProcesso }, 'Assinatura verificada'); }}>
                                Verificar assinatura digital
                              </BotaoAcao>
                              <p className="text-xs text-muted-foreground">Se o vendedor assinou pelo app Carteira Digital de Trânsito, clique para conferir.</p>
                            </div>
                          </>
                        )}
                      </section>
                    )}

                    {processo.renave_id_estoque !== null && (
                      <BlocoNfe
                        titulo="NF-e de entrada"
                        acao="nf_entrada"
                        processando={processando}
                        chave={chaveNfEntrada}
                        onChave={setChaveNfEntrada}
                        onEnviar={() => {
                          if (!idProcesso) return;
                          void rodar('nf_entrada', { id_processo: idProcesso, chave: chaveNfEntrada }, 'NF de entrada enviada').then((resposta) => { if (resposta) setChaveNfEntrada(''); });
                        }}
                        chaveEnviada={processo.chave_nfe_entrada}
                        enviadaEm={processo.nfe_entrada_enviada_em}
                      />
                    )}

                    <div className="flex flex-wrap gap-2">
                      {processo.renave_id_estoque !== null && (
                        <BotaoAcao acao="termo-entrada" processando={processando} onClick={() => { if (idProcesso) void rodar('termo', { id_processo: idProcesso, tipo: 'entrada' }, 'Termo de entrada gerado'); }}>
                          Termo de entrada
                        </BotaoAcao>
                      )}
                      {podeGerenciar && processo.renave_id_estoque !== null && !processo.saida_em && processo.estado !== 'CANCELADO' && (
                        <BotaoAcao acao="cancelar_entrada" processando={processando} onClick={() => setConfirmarCancelarEntrada(true)} variant="destructive">
                          Cancelar entrada
                        </BotaoAcao>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="saida" className="space-y-4">
                    {!saidaEditavel && <p className="text-sm text-muted-foreground">A saída já foi comunicada ao RENAVE; os dados estão somente para leitura.</p>}
                    <div className="space-y-2">
                      <Label>Comprador</Label>
                      <PessoaRenaveSelect pessoas={pessoas} valor={comprador} onChange={(valor) => { setComprador(valor); setSaidaSuja(true); }} disabled={!saidaEditavel} placeholder="Selecione o comprador" />
                      {pessoaComprador && (
                        <>
                          <p className="text-xs text-muted-foreground">CPF/CNPJ: {formatarDocumento(pessoaComprador.cpf_cnpj) || 'não informado'}</p>
                          <p className="text-xs text-muted-foreground">Município: {pessoaComprador.municipio || 'não informado'}{pessoaComprador.estado ? `/${pessoaComprador.estado}` : ''}</p>
                        </>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Data da venda</Label>
                        <Input type="date" value={dataSaida} onChange={(evento) => { setDataSaida(evento.target.value); setSaidaSuja(true); }} disabled={!saidaEditavel} />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor da venda</Label>
                        <Input value={valorSaida} onChange={(evento) => { setValorSaida(maskCurrency(evento.target.value)); setSaidaSuja(true); }} placeholder="R$ 0,00" disabled={!saidaEditavel} />
                      </div>
                    </div>

                    {processo.estado === 'CONFIRMADO' && !processo.saida_em && (
                      <section className="space-y-3 rounded-md border border-border/50 p-3">
                        <h3 className="text-sm font-medium">CRV novo (em nome da loja)</h3>
                        <p className="text-xs text-muted-foreground">Depois que o Detran confirma a entrada, o CRV é reemitido em nome da loja, com novo número e novo código de segurança. A saída usa esse CRV novo.</p>
                        <BotaoAcao acao="codigo_crv" processando={processando} onClick={() => {
                          if (!idProcesso) return;
                          void rodar('codigo_crv', { id_processo: idProcesso }, 'Código do CRV novo gerado').then((resposta) => {
                            if (resposta?.numero_crv) setNumeroCrvSaida(resposta.numero_crv);
                          });
                        }}>
                          Buscar código do CRV novo
                        </BotaoAcao>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Nº do CRV novo</Label>
                            <Input inputMode="numeric" maxLength={12} value={numeroCrvSaida} onChange={(evento) => { setNumeroCrvSaida(evento.target.value.replace(/\D/g, '').slice(0, 12)); setSaidaSuja(true); }} />
                          </div>
                          <div className="space-y-2">
                            <Label>Código de segurança do CRV novo</Label>
                            {temCodigoSaida && !substituirCodigoSaida ? (
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-green-500">✓ Código informado</span>
                                <Button type="button" variant="outline" size="sm" disabled={processando !== null} onClick={() => setSubstituirCodigoSaida(true)}>Substituir</Button>
                              </div>
                            ) : (
                              <Input type="password" autoComplete="new-password" inputMode="numeric" maxLength={11} value={codigoSegurancaSaida}
                                onChange={(evento) => { setCodigoSegurancaSaida(evento.target.value.replace(/\D/g, '').slice(0, 11)); setSaidaSuja(true); }} placeholder="11 dígitos" />
                            )}
                          </div>
                        </div>
                      </section>
                    )}

                    <ListaPendencias titulo="Pendências para comunicar a saída" itens={pendSaida} />

                    <div className="flex flex-wrap gap-2">
                      {saidaEditavel && (
                        <BotaoAcao acao="salvar-saida" processando={processando} onClick={() => { void executarLocal('salvar-saida', persistirSaida, 'Dados da saída salvos', 'Erro ao salvar a saída'); }} variant="default">
                          Salvar dados da saída
                        </BotaoAcao>
                      )}
                      {!processo.saida_em && (
                        <BotaoAcao
                          acao="saida"
                          processando={processando}
                          onClick={() => setConfirmarSaida(true)}
                          disabled={processo.etapa !== 'PRONTO_PARA_SAIDA' || pendSaida.length > 0 || !temCodigoSaida}
                          variant="default"
                        >
                          Comunicar saída
                        </BotaoAcao>
                      )}
                    </div>

                    {processo.saida_em && (
                      <>
                        <div className="grid gap-2 rounded-md border border-border/50 bg-muted/20 p-3 text-sm sm:grid-cols-2">
                          <p><span className="text-muted-foreground">Saída comunicada em:</span> <strong>{formatarDataHora(processo.saida_em)}</strong></p>
                          <p><span className="text-muted-foreground">ATPV-e:</span> <strong>{processo.numero_atpv || 'Não informado'}</strong></p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <BotaoAcao acao="atpv-saida" processando={processando} onClick={() => { if (idProcesso) void rodar('atpv', { id_processo: idProcesso }, 'ATPV-e gerado'); }}>
                            Baixar ATPV-e
                          </BotaoAcao>
                          <BotaoAcao acao="termo-saida" processando={processando} onClick={() => { if (idProcesso) void rodar('termo', { id_processo: idProcesso, tipo: 'saida' }, 'Termo de saída gerado'); }}>
                            Termo de saída
                          </BotaoAcao>
                          {podeGerenciar && (
                            <BotaoAcao acao="cancelar_saida" processando={processando} onClick={() => setConfirmarCancelarSaida(true)} variant="destructive">
                              Cancelar saída
                            </BotaoAcao>
                          )}
                        </div>
                        <BlocoNfe
                          titulo="NF-e de venda"
                          acao="nf_saida"
                          processando={processando}
                          chave={chaveNfSaida}
                          onChave={setChaveNfSaida}
                          onEnviar={() => {
                            if (!idProcesso) return;
                            void rodar('nf_saida', { id_processo: idProcesso, chave: chaveNfSaida }, 'NF de saída enviada').then((resposta) => { if (resposta) setChaveNfSaida(''); });
                          }}
                          chaveEnviada={processo.chave_nfe_saida}
                          enviadaEm={processo.nfe_saida_enviada_em}
                        />
                      </>
                    )}
                  </TabsContent>
                </Tabs>

                {secaoDocumentos}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {processo && processo.renave_id_estoque === null ? (
              <Button variant="destructive" onClick={() => setConfirmarExclusao(true)} disabled={processando !== null}>
                {processando === 'excluir' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir processo
              </Button>
            ) : <span />}
            <Button variant="outline" onClick={onFechar} disabled={processando !== null}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmarInicio} onOpenChange={setConfirmarInicio}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar RENAVE?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao comunicar a entrada no RENAVE, a loja passa a ser responsável pelo veículo no Renavam. Depois disso ele só poderá ser transferido pelo RENAVE (saída) ou com o cancelamento da entrada enquanto o Detran não agir. Iniciar o processo agora apenas prepara os dados — nada é enviado ainda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleIniciar}>Iniciar RENAVE</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir processo RENAVE?</AlertDialogTitle>
            <AlertDialogDescription>Os dados preenchidos serão apagados e o veículo voltará a ficar fora do RENAVE.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir processo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarEntrada} onOpenChange={setConfirmarEntrada}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Comunicar a entrada ao RENAVE?</AlertDialogTitle>
            <AlertDialogDescription>A loja passa a ser responsável pelo veículo no Renavam. Só dá para desfazer com o cancelamento da entrada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setConfirmarEntrada(false);
              if (idProcesso) void rodar('entrada', { id_processo: idProcesso }, 'Entrada comunicada', prepararEntrada);
            }}>Comunicar entrada</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarSaida} onOpenChange={setConfirmarSaida}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Comunicar a saída ao RENAVE?</AlertDialogTitle>
            <AlertDialogDescription>A partir da data da venda o comprador passa a ser o responsável pelo veículo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setConfirmarSaida(false);
              if (idProcesso) void rodar('saida', { id_processo: idProcesso }, 'Saída comunicada', prepararSaida);
            }}>Comunicar saída</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarCancelarEntrada} onOpenChange={setConfirmarCancelarEntrada}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar a entrada no RENAVE?</AlertDialogTitle>
            <AlertDialogDescription>O veículo deixa de constar no estoque da loja. Depois do cancelamento será preciso iniciar um novo processo para comunicar de novo.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-cancelamento-entrada">Motivo do cancelamento</Label>
            <Input id="motivo-cancelamento-entrada" value={motivoCancelamento} onChange={(evento) => setMotivoCancelamento(evento.target.value)} placeholder="Informe o motivo" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              setConfirmarCancelarEntrada(false);
              if (idProcesso) void rodar('cancelar_entrada', { id_processo: idProcesso, motivo: motivoCancelamento }, 'Entrada cancelada no RENAVE');
            }}>Cancelar entrada</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarCancelarSaida} onOpenChange={setConfirmarCancelarSaida}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar a saída?</AlertDialogTitle>
            <AlertDialogDescription>O veículo volta ao estoque da loja no RENAVE (com um novo número de estoque) e o ATPV-e da venda perde a validade.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              setConfirmarCancelarSaida(false);
              if (idProcesso) void rodar('cancelar_saida', { id_processo: idProcesso }, 'Saída cancelada no RENAVE');
            }}>Cancelar saída</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
