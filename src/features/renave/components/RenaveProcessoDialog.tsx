import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { maskCurrency, unmaskCurrency } from '@/features/estoque/utils/masks';
import {
  buscarPessoasRenave, buscarProcesso, buscarVeiculoRenave, buscarVendaDoCiclo, excluirProcesso,
  iniciarProcesso, mensagemErroRenave, salvarEntrada, salvarSaida,
} from '../services/renave-service';
import { useRenaveConfig } from '../hooks/use-renave-habilitado';
import { PASSOS_RENAVE, passoAtual } from '../utils/etapas';
import { pendenciasEntrada, pendenciasSaida } from '../utils/pendencias';
import { RenaveEtapaBadge } from './RenaveEtapaBadge';
import { PessoaRenaveSelect } from './PessoaRenaveSelect';
import { formatarDocumento } from '../utils/documento';

const MOTIVOS = ['Venda financiada', 'Exigência do comprador', 'Outro'];
const TIPOS_CRV = ['Azul', 'Verde', 'Branco', 'Digital'];
const TOOLTIP_PROXIMA_FASE = 'Disponível após a conexão com o RENAVE (próxima fase)';

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

const moeda = (valor: number | null | undefined) => (valor ? maskCurrency(Number(valor)) : '');

function AcaoProximaFase({ rotulo }: { rotulo: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>
          <Button type="button" variant="outline" size="sm" disabled>{rotulo}</Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{TOOLTIP_PROXIMA_FASE}</TooltipContent>
    </Tooltip>
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

export function RenaveProcessoDialog({ idEstoque, aberto, onFechar }: Props) {
  const queryClient = useQueryClient();
  const habilitado = aberto && !!idEstoque;
  const { data: config } = useRenaveConfig();

  const processoQuery = useQuery({
    queryKey: ['renave-processo', idEstoque],
    queryFn: () => buscarProcesso(idEstoque as number),
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

  const processo = processoQuery.data ?? null;
  const pessoas = useMemo(() => pessoasQuery.data ?? [], [pessoasQuery.data]);
  const veiculo = veiculoQuery.data ?? null;

  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [confirmarInicio, setConfirmarInicio] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [processando, setProcessando] = useState(false);

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
  // Formulário de saída
  const [comprador, setComprador] = useState<string | null>(null);
  const [dataSaida, setDataSaida] = useState('');
  const [valorSaida, setValorSaida] = useState('');

  // Preenche os formulários sempre que o processo é (re)carregado.
  useEffect(() => {
    if (!processo) return;
    const venda = vendaQuery.data;
    setProprietario(processo.id_pessoa_proprietario_crv);
    setDataEntrada(processo.data_entrada ?? '');
    setValorEntrada(moeda(processo.valor_entrada));
    setKm(processo.km_entrada !== null ? String(processo.km_entrada) : '');
    setDataMedicao(paraDataHoraLocal(processo.data_medicao_hodometro));
    setTipoCrv(processo.tipo_crv ?? '');
    setNumeroCrv(processo.numero_crv ?? '');
    setCodigoSeguranca('');
    setSubstituirCodigo(false);
    setEmailVendedor(processo.email_vendedor ?? '');
    setComprador(processo.id_pessoa_comprador ?? venda?.id_cliente ?? null);
    setDataSaida(processo.data_saida ?? (venda?.data_venda ? venda.data_venda.slice(0, 10) : ''));
    setValorSaida(moeda(processo.valor_saida ?? venda?.valor_total_venda));
    if (processo.motivo) setMotivo(processo.motivo);
  }, [processo, vendaQuery.data]);

  const recarregar = async () => {
    await queryClient.invalidateQueries({ queryKey: ['renave-processo', idEstoque] });
    await queryClient.invalidateQueries({ queryKey: ['renave-etapas'] });
  };

  const executar = async (acao: () => Promise<void>, sucesso: string, falha: string) => {
    setProcessando(true);
    try {
      await acao();
      toast({ title: sucesso });
      await recarregar();
    } catch (error) {
      toast({ title: falha, description: mensagemErroRenave(error, falha), variant: 'destructive' });
    } finally {
      setProcessando(false);
    }
  };

  const handleIniciar = () => {
    setConfirmarInicio(false);
    if (!idEstoque) return;
    void executar(async () => { await iniciarProcesso(idEstoque, motivo); }, 'Processo RENAVE iniciado', 'Não foi possível iniciar o RENAVE');
  };

  const entradaEditavel = !!processo && processo.renave_id_estoque === null;
  const saidaEditavel = !!processo && processo.saida_em === null;

  const handleSalvarEntrada = () => {
    if (!processo?.id) return;
    const id = processo.id;
    void executar(() => salvarEntrada(id, {
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
    }), 'Dados da entrada salvos', 'Erro ao salvar a entrada');
  };

  const handleSalvarSaida = () => {
    if (!processo?.id) return;
    const id = processo.id;
    void executar(() => salvarSaida(id, {
      id_pessoa_comprador: comprador,
      data_saida: dataSaida || null,
      valor_saida: valorSaida ? unmaskCurrency(valorSaida) : null,
      id_venda: processo.id_venda ?? vendaQuery.data?.id ?? null,
    }), 'Dados da saída salvos', 'Erro ao salvar a saída');
  };

  const handleExcluir = () => {
    setConfirmarExclusao(false);
    if (!processo?.id) return;
    const id = processo.id;
    void executar(() => excluirProcesso(id), 'Processo RENAVE excluído', 'Não foi possível excluir o processo');
  };

  const pessoaProprietario = pessoas.find((p) => p.id === proprietario) ?? null;
  const pessoaComprador = pessoas.find((p) => p.id === comprador) ?? null;
  const temCodigo = processo?.tem_codigo_seguranca === true;

  const pendEntrada = pendenciasEntrada({
    proprietario: pessoaProprietario,
    renavam: veiculo?.renavam ?? null,
    chassi: veiculo?.chassi ?? null,
    tipoCrv,
    temCodigoSeguranca: temCodigo || codigoSeguranca.replace(/\D/g, '').length > 0,
    km,
    dataMedicao,
    valor: valorEntrada ? unmaskCurrency(valorEntrada) : null,
    data: dataEntrada,
    emailEstabelecimento: config?.email ?? null,
  });
  const pendSaida = pendenciasSaida(pessoaComprador);

  const erro = processo?.ultimo_erro as { mensagemParaUsuarioFinal?: string; detalhe?: string } | null | undefined;
  const mensagemErro = erro ? (erro.mensagemParaUsuarioFinal ?? erro.detalhe) : null;
  const passo = passoAtual(processo?.etapa);
  const carregando = processoQuery.isLoading || veiculoQuery.isLoading;

  return (
    <>
      <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar(); }}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              Processo RENAVE
              {processo && <RenaveEtapaBadge etapa={processo.etapa} mostrarFora />}
            </DialogTitle>
            {veiculo && (
              <p className="text-sm text-muted-foreground">
                {[veiculo.fabricante, veiculo.modelo].filter(Boolean).join(' ')} {veiculo.placa ? `| ${veiculo.placa}` : ''}
              </p>
            )}
          </DialogHeader>

          <div className="-mx-6 flex-1 overflow-y-auto px-6">
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
                <Button onClick={() => setConfirmarInicio(true)} disabled={processando}>
                  {processando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar RENAVE
                </Button>
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
                      <PessoaRenaveSelect pessoas={pessoas} valor={proprietario} onChange={setProprietario} disabled={!entradaEditavel} />
                      {pessoaProprietario && <p className="text-xs text-muted-foreground">CPF/CNPJ: {formatarDocumento(pessoaProprietario.cpf_cnpj) || 'não informado'}</p>}
                      <p className="text-xs text-muted-foreground">Deve ser exatamente quem consta no CRV hoje. Pode ser diferente do fornecedor da compra (ex.: o carro foi transferido para uma pessoa da loja).</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Data da entrada</Label>
                        <Input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} disabled={!entradaEditavel} />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor da entrada</Label>
                        <Input value={valorEntrada} onChange={(e) => setValorEntrada(maskCurrency(e.target.value))} placeholder="R$ 0,00" disabled={!entradaEditavel} />
                        <p className="text-xs text-muted-foreground">Valor que constará no ATPV-e.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>KM</Label>
                        <Input inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ''))} disabled={!entradaEditavel} />
                      </div>
                      <div className="space-y-2">
                        <Label>Data/hora da medição do hodômetro</Label>
                        <Input type="datetime-local" value={dataMedicao} onChange={(e) => setDataMedicao(e.target.value)} disabled={!entradaEditavel} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de CRV</Label>
                        <Select value={tipoCrv} onValueChange={setTipoCrv} disabled={!entradaEditavel}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{TIPOS_CRV.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nº do CRV (opcional)</Label>
                        <Input inputMode="numeric" maxLength={12} value={numeroCrv} onChange={(e) => setNumeroCrv(e.target.value.replace(/\D/g, '').slice(0, 12))} disabled={!entradaEditavel} />
                      </div>
                      <div className="space-y-2">
                        <Label>Código de segurança do CRV</Label>
                        {temCodigo && !substituirCodigo ? (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-green-500">✓ Código informado</span>
                            {entradaEditavel && <Button type="button" variant="outline" size="sm" onClick={() => setSubstituirCodigo(true)}>Substituir</Button>}
                          </div>
                        ) : (
                          <Input type="password" autoComplete="new-password" inputMode="numeric" maxLength={11} value={codigoSeguranca}
                            onChange={(e) => setCodigoSeguranca(e.target.value.replace(/\D/g, '').slice(0, 11))} disabled={!entradaEditavel} placeholder="11 dígitos" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>E-mail do vendedor (opcional)</Label>
                        <Input type="email" value={emailVendedor} onChange={(e) => setEmailVendedor(e.target.value)} disabled={!entradaEditavel} />
                      </div>
                    </div>

                    <ListaPendencias titulo="Pendências para comunicar a entrada" itens={pendEntrada} />

                    <div className="flex flex-wrap gap-2">
                      {entradaEditavel && (
                        <Button onClick={handleSalvarEntrada} disabled={processando}>
                          {processando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar dados da entrada
                        </Button>
                      )}
                      <AcaoProximaFase rotulo="Consultar aptidão" />
                      <AcaoProximaFase rotulo="Comunicar entrada" />
                      <AcaoProximaFase rotulo="Baixar ATPV-e" />
                      <AcaoProximaFase rotulo="Enviar assinatura" />
                      <AcaoProximaFase rotulo="Enviar NF-e" />
                      <AcaoProximaFase rotulo="Atualizar status" />
                      <AcaoProximaFase rotulo="Cancelar entrada" />
                    </div>
                  </TabsContent>

                  <TabsContent value="saida" className="space-y-4">
                    {!saidaEditavel && <p className="text-sm text-muted-foreground">A saída já foi comunicada ao RENAVE; os dados estão somente para leitura.</p>}
                    <div className="space-y-2">
                      <Label>Comprador</Label>
                      <PessoaRenaveSelect pessoas={pessoas} valor={comprador} onChange={setComprador} disabled={!saidaEditavel} placeholder="Selecione o comprador" />
                      {pessoaComprador && <p className="text-xs text-muted-foreground">CPF/CNPJ: {formatarDocumento(pessoaComprador.cpf_cnpj) || 'não informado'}</p>}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Data da venda</Label>
                        <Input type="date" value={dataSaida} onChange={(e) => setDataSaida(e.target.value)} disabled={!saidaEditavel} />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor da venda</Label>
                        <Input value={valorSaida} onChange={(e) => setValorSaida(maskCurrency(e.target.value))} placeholder="R$ 0,00" disabled={!saidaEditavel} />
                      </div>
                    </div>

                    <ListaPendencias titulo="Pendências para comunicar a saída" itens={pendSaida} />

                    <div className="flex flex-wrap gap-2">
                      {saidaEditavel && (
                        <Button onClick={handleSalvarSaida} disabled={processando}>
                          {processando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar dados da saída
                        </Button>
                      )}
                      <AcaoProximaFase rotulo="Comunicar saída" />
                      <AcaoProximaFase rotulo="Enviar NF-e" />
                      <AcaoProximaFase rotulo="Atualizar status" />
                      <AcaoProximaFase rotulo="Cancelar saída" />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {processo && processo.renave_id_estoque === null ? (
              <Button variant="destructive" onClick={() => setConfirmarExclusao(true)} disabled={processando}>Excluir processo</Button>
            ) : <span />}
            <Button variant="outline" onClick={onFechar}>Fechar</Button>
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
    </>
  );
}

