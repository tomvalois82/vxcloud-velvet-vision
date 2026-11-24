import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RenaveProcessoDialog } from '../components/RenaveProcessoDialog';
import { buscarSituacaoRenaveVenda } from '../services/renave-service';
import { avisoRenaveAposVenda, type AvisoRenaveVenda } from '../utils/pendencias';
import { useRenaveHabilitado } from './use-renave-habilitado';

const TEXTOS: Record<'lembrar_saida' | 'sugerir_inicio', { titulo: string; texto: string; cancelar: string }> = {
  lembrar_saida: { titulo: 'Veículo no RENAVE', texto: 'Este veículo está no RENAVE. Lembre-se de comunicar a saída.', cancelar: 'Fechar' },
  sugerir_inicio: { titulo: 'Venda financiada', texto: 'Vendas financiadas normalmente exigem RENAVE. Deseja iniciar o processo?', cancelar: 'Agora não' },
};

// Avisos informativos do RENAVE após fechar a venda. A venda já está fechada quando roda.
export function useAvisoRenaveVenda(aoConcluir: () => void) {
  const habilitado = useRenaveHabilitado();
  const [aviso, setAviso] = useState<AvisoRenaveVenda>(null);
  const [idEstoque, setIdEstoque] = useState<number | null>(null);
  const [processoAberto, setProcessoAberto] = useState(false);

  // Retorna true quando um aviso foi exibido (o chamador deve aguardar aoConcluir).
  const verificar = async (idVeiculo: number | null | undefined, idVenda: string | null | undefined): Promise<boolean> => {
    if (!habilitado || !idVeiculo || !idVenda) return false;
    try {
      const resultado = avisoRenaveAposVenda(await buscarSituacaoRenaveVenda(idVeiculo, idVenda));
      if (!resultado) return false;
      setIdEstoque(idVeiculo);
      setAviso(resultado);
      return true;
    } catch {
      // Falha na consulta informativa não deve atrapalhar a venda já fechada.
      return false;
    }
  };

  const textos = aviso ? TEXTOS[aviso] : null;
  const elemento = (
    <>
      <AlertDialog open={!!aviso} onOpenChange={(open) => { if (!open && aviso) { setAviso(null); aoConcluir(); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{textos?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>{textos?.texto}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{textos?.cancelar}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); setAviso(null); setProcessoAberto(true); }}>Abrir RENAVE</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <RenaveProcessoDialog idEstoque={idEstoque} aberto={processoAberto} onFechar={() => { setProcessoAberto(false); aoConcluir(); }} />
    </>
  );

  return { verificar, elemento };
}
