import { baixarDocumentoRenave } from '../services/renave-service';

// Abre o documento numa nova aba como blob. Se o navegador bloquear o pop-up (ou se forcarDownload), faz o download.
export async function abrirDocumentoRenave(storagePath: string, forcarDownload = false): Promise<void> {
  const blob = await baixarDocumentoRenave(storagePath);
  const nome = storagePath.split('/').pop() || 'documento';
  const url = URL.createObjectURL(blob);
  const aba = forcarDownload ? null : window.open(url, '_blank');
  if (!aba) {
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
