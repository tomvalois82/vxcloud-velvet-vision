import { FileCheck2 } from 'lucide-react';
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
  const emailInvalido = !!valores.renave_email && !emailValido(valores.renave_email);

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileCheck2 className="w-5 h-5 text-accent" />
          RENAVE
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
            <Select value={valores.renave_ambiente} onValueChange={(v) => alterar('renave_ambiente', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="homologacao">Homologação (testes)</SelectItem>
                <SelectItem value="producao">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>E-mail do estabelecimento para o RENAVE</Label>
            <Input type="email" value={valores.renave_email || ''} onChange={(e) => alterar('renave_email', e.target.value)} placeholder="renave@empresa.com.br" />
            {emailInvalido && <p className="text-sm text-destructive">Informe um e-mail válido.</p>}
          </div>
        </div>
        <RenaveCertificadoSecao />
      </CardContent>
    </Card>
  );
}
