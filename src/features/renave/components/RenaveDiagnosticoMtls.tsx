// TEMPORÁRIO: diagnóstico mTLS RENAVE — remover depois do teste
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSuperUser } from '@/hooks/useSuperUser';

interface RelatorioDiagnostico {
  resumo?: { conclusao?: string };
}

export function RenaveDiagnosticoMtls() {
  const { isSuperUser } = useSuperUser();
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<RelatorioDiagnostico | null>(null);

  if (!isSuperUser) return null;

  const executar = async () => {
    setExecutando(true);
    setResultado(null);
    try {
      const { data, error } = await supabase.functions.invoke('renave-teste-mtls');
      if (error) throw error;
      setResultado(data as RelatorioDiagnostico);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Falha ao executar o diagnóstico');
    } finally {
      setExecutando(false);
    }
  };

  return (
    <div className="space-y-2 border-t border-border/50 pt-4">
      <Button type="button" variant="outline" onClick={executar} disabled={executando}>
        {executando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Diagnóstico de conexão (temporário)
      </Button>
      {resultado && (
        <>
          {resultado.resumo?.conclusao && <p className="text-sm font-semibold">{resultado.resumo.conclusao}</p>}
          <pre className="max-h-96 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(resultado, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
