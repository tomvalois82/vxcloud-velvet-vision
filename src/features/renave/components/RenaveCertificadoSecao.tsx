import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { maskCNPJ } from '@/features/pessoas/utils/masks';
import {
  buscarCertificadoAtivo, CHAVE_CERTIFICADO, CHAVE_PODE_GERENCIAR, enviarCertificado,
  podeGerenciarCertificado, removerCertificado, testarConexao, type RespostaTeste,
} from '../certificado-service';
import { CHAVE_RENAVE_HABILITADO } from '../hooks/use-renave-habilitado';
import { diasParaVencer } from '../utils/certificado';

const formatarData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const formatarDataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function RenaveCertificadoSecao() {
  const queryClient = useQueryClient();
  const { data: certificado, isLoading } = useQuery({ queryKey: CHAVE_CERTIFICADO, queryFn: buscarCertificadoAtivo });
  const { data: podeGerenciar } = useQuery({ queryKey: CHAVE_PODE_GERENCIAR, queryFn: podeGerenciarCertificado });

  const [dialogAberto, setDialogAberto] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [testando, setTestando] = useState(false);
  const [teste, setTeste] = useState<RespostaTeste | null>(null);

  const dias = certificado ? diasParaVencer(certificado.valido_ate) : null;

  const fecharDialog = () => {
    setDialogAberto(false); setArquivo(null); setSenha(''); setErroEnvio(null); setMostrarSenha(false);
  };

  const invalidar = async () => {
    await queryClient.invalidateQueries({ queryKey: CHAVE_CERTIFICADO });
    await queryClient.invalidateQueries({ queryKey: CHAVE_RENAVE_HABILITADO });
    await queryClient.invalidateQueries({ queryKey: ['empresa'] });
  };

  const enviar = async () => {
    if (!arquivo) { setErroEnvio('Selecione o arquivo do certificado (.pfx ou .p12).'); return; }
    if (!senha) { setErroEnvio('Informe a senha do certificado.'); return; }
    setEnviando(true); setErroEnvio(null);
    try {
      const resposta = await enviarCertificado(arquivo, senha);
      if (!resposta.ok) { setErroEnvio(resposta.erro ?? 'Não foi possível enviar o certificado.'); return; }
      fecharDialog();
      toast({ title: 'Certificado enviado com sucesso' });
      (resposta.avisos ?? []).forEach((aviso) => toast({ title: 'Atenção', description: aviso }));
      await invalidar();
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : 'Não foi possível enviar o certificado.');
    } finally { setEnviando(false); }
  };

  const remover = async () => {
    setRemovendo(true);
    try {
      const resposta = await removerCertificado();
      if (!resposta.ok) { toast({ title: 'Erro ao remover', description: resposta.erro, variant: 'destructive' }); return; }
      toast({ title: 'Certificado removido' });
      setTeste(null);
      await invalidar();
    } finally { setRemovendo(false); setConfirmarRemocao(false); }
  };

  const testar = async () => {
    setTestando(true); setTeste(null);
    try {
      const resposta = await testarConexao();
      if (!resposta.resultados && resposta.erro) toast({ title: 'Teste de conexão', description: resposta.erro, variant: 'destructive' });
      setTeste(resposta);
    } finally { setTestando(false); }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/50 p-4">
      <h3 className="font-semibold text-foreground">Certificado digital (e-CNPJ A1)</h3>

      {certificado && dias !== null && dias <= 30 && (
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" />
          <AlertDescription>Renove o certificado A1 e cadastre o novo no Credencia (Senatran) antes do vencimento, senão o RENAVE para de funcionar em produção.</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : !certificado ? (
        <p className="text-sm text-muted-foreground">Nenhum certificado enviado. Em homologação o RENAVE funciona sem certificado; em produção ele é obrigatório.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Titular:</span> {certificado.titular ?? '—'}</div>
          <div><span className="text-muted-foreground">CNPJ:</span> {maskCNPJ(certificado.cnpj)}</div>
          <div><span className="text-muted-foreground">Emissor:</span> {certificado.emissor ?? '—'}</div>
          <div className="break-all"><span className="text-muted-foreground">Nº de série:</span> {certificado.numero_serie}</div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Válido até:</span> {formatarData(certificado.valido_ate)}
            {dias !== null && dias < 0 && <Badge variant="destructive">Vencido</Badge>}
            {dias !== null && dias >= 0 && dias <= 30 && <Badge className="bg-amber-500 text-black hover:bg-amber-500">Vence em {dias} dias</Badge>}
            {dias !== null && dias > 30 && <Badge className="bg-green-600 hover:bg-green-600">Válido</Badge>}
          </div>
          <div className="text-muted-foreground">Enviado por {certificado.enviado_por_nome ?? '—'} em {formatarDataHora(certificado.enviado_em)}</div>
        </div>
      )}

      {podeGerenciar && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setDialogAberto(true)}>{certificado ? 'Substituir certificado' : 'Enviar certificado'}</Button>
          {certificado && <Button type="button" variant="destructive" onClick={() => setConfirmarRemocao(true)}>Remover certificado</Button>}
          <Button type="button" variant="outline" onClick={testar} disabled={testando}>
            {testando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Testar conexão
          </Button>
        </div>
      )}

      {teste && teste.resultados && (
        <div className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
          <p><span className="text-muted-foreground">Ambiente:</span> {teste.ambiente === 'producao' ? 'Produção' : 'Homologação'}</p>
          {teste.resultados.map((r, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-start gap-2">
                {r.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" /> : <XCircle className="h-4 w-4 mt-0.5 text-destructive" />}
                <div>
                  <p className="font-medium">{r.usou_certificado ? 'Com certificado da loja' : 'Sem certificado'}</p>
                  <p>{r.mensagem}</p>
                  <p className="text-xs text-muted-foreground">HTTP {r.http_status} · {(r.duracao_ms / 1000).toFixed(1).replace('.', ',')} s</p>
                  {r.cnpj_confere === false && <p className="text-destructive">O RENAVE respondeu com outro CNPJ</p>}
                </div>
              </div>
            </div>
          ))}
          {teste.observacao && <p className="text-xs text-muted-foreground">{teste.observacao}</p>}
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={(aberto) => { if (!aberto && !enviando) fecharDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{certificado ? 'Substituir certificado' : 'Enviar certificado'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {erroEnvio && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{erroEnvio}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label htmlFor="renave-pfx">Arquivo do certificado</Label>
              <Input id="renave-pfx" type="file" accept=".pfx,.p12" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="renave-senha">Senha</Label>
              <div className="flex gap-2">
                <Input id="renave-senha" type={mostrarSenha ? 'text' : 'password'} autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} />
                <Button type="button" variant="outline" size="icon" onClick={() => setMostrarSenha((v) => !v)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">O arquivo e a senha são guardados criptografados e não podem ser baixados de volta. Ao substituir, o certificado anterior é apagado.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fecharDialog} disabled={enviando}>Cancelar</Button>
            <Button type="button" onClick={enviar} disabled={enviando}>{enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmarRemocao} onOpenChange={setConfirmarRemocao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover certificado?</AlertDialogTitle>
            <AlertDialogDescription>O certificado será apagado do sistema. As operações do RENAVE em produção param até um novo certificado ser enviado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void remover(); }} disabled={removendo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removendo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
