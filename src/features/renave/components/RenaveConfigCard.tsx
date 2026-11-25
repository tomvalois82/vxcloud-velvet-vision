import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FileCheck2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RenaveAmbienteBadge } from './RenaveAmbienteBadge';
import { buscarCertificadoAtivo, CHAVE_CERTIFICADO, CHAVE_PODE_GERENCIAR, podeGerenciarCertificado } from '../certificado-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RenaveCertificadoSecao } from './RenaveCertificadoSecao';
import { emailValido } from '../utils/pendencias';

export interface ConfigRenave {
  renave_habilitado: boolean;
  renave_ambiente: string;
  renave_email: string | null;
  renave_cnpj_certificado: string | null;
  renave_certificado_validade: string | null;
}

interface Props {
  valores: ConfigRenave;
  onChange: (valores: ConfigRenave) => void;
}

export function RenaveConfigCard({ valores, onChange }: Props) {
  const alterar = <K extends keyof ConfigRenave>(campo: K, valor: ConfigRenave[K]) => onChange({ ...valores, [campo]: valor });
  const [ambientePendente, setAmbientePendente] = useState<string | null>(null);
  const { data: podeGerenciar } = useQuery({ queryKey: CHAVE_PODE_GERENCIAR, queryFn: podeGerenciarCertificado });
  const { data: certificado } = useQuery({ queryKey: CHAVE_CERTIFICADO, queryFn: buscarCertificadoAtivo });
  const paraProducao = ambientePendente === 'producao';

  // A troca de ambiente sempre passa por confirmação antes de alterar o formulário.
  const solicitarAmbiente = (novo: string) => {
    if (novo !== valores.renave_ambiente) setAmbientePendente(novo);
  };
  const confirmarAmbiente = () => {
    if (ambientePendente) alterar('renave_ambiente', ambientePendente);
    setAmbientePendente(null);
  };
  const emailInvalido = !!valores.renave_email && !emailValido(valores.renave_email);

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileCheck2 className="w-5 h-5 text-accent" />
          RENAVE
          <RenaveAmbienteBadge ambiente={valores.renave_ambiente} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch id="renave-habilitado" checked={valores.renave_habilitado} onCheckedChange={(v) => alterar('renave_habilitado', v)} />
          <Label htmlFor="renave-habilitado">Usar RENAVE nesta empresa</Label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ambiente</Label>
            <Select value={valores.renave_ambiente} onValueChange={solicitarAmbiente} disabled={podeGerenciar !== true}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="homologacao">Homologação (testes)</SelectItem>
                <SelectItem value="producao">Produção</SelectItem>
              </SelectContent>
            </Select>
            {podeGerenciar === false && <p className="text-xs text-muted-foreground">Apenas super admin ou Gerente pode trocar o ambiente.</p>}
            <p className="text-xs text-muted-foreground">A troca só vale depois de clicar em Salvar Alterações.</p>
          </div>
          <div className="space-y-2">
            <Label>E-mail do estabelecimento para o RENAVE</Label>
            <Input type="email" value={valores.renave_email || ''} onChange={(e) => alterar('renave_email', e.target.value)} placeholder="renave@empresa.com.br" />
            {emailInvalido && <p className="text-sm text-destructive">Informe um e-mail válido.</p>}
          </div>
        </div>
        <RenaveCertificadoSecao />
      </CardContent>
      <AlertDialog open={!!ambientePendente} onOpenChange={(aberto) => { if (!aberto) setAmbientePendente(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{paraProducao ? 'Mudar o RENAVE para PRODUÇÃO?' : 'Voltar o RENAVE para HOMOLOGAÇÃO?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {paraProducao
                ? 'A partir de agora, os novos processos RENAVE serão comunicados de verdade ao Detran. Processos de teste já iniciados em homologação continuam em homologação e não viram processos reais.'
                : 'Os novos processos serão apenas testes no ambiente do Serpro e não terão validade. Processos reais já iniciados em produção continuam em produção.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {paraProducao && !certificado && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Não há certificado A1 enviado. Em produção nenhuma operação vai funcionar até você enviar o certificado.</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarAmbiente}>{paraProducao ? 'Mudar para Produção' : 'Voltar para Homologação'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
