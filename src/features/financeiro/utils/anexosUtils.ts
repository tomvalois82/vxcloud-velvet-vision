import { supabase } from "@/integrations/supabase/client";

const BUCKET_NAME = "bucket";

/**
 * Delete all attachments associated with a financial movement
 * Call this BEFORE deleting the movement record
 */
export async function deleteAnexosDoMovimento(movimentoId: string): Promise<void> {
  try {
    // First, get all attachments for this movement
    const { data: anexos, error: fetchError } = await supabase
      .from("vx_fin_anexo")
      .select("id, url_arquivo")
      .eq("id_movimento", movimentoId);

    if (fetchError) throw fetchError;
    if (!anexos || anexos.length === 0) return;

    // Extract file paths from URLs and delete from storage
    const filePaths: string[] = [];
    for (const anexo of anexos) {
      const urlParts = anexo.url_arquivo.split("/");
      const pathIndex = urlParts.findIndex((p) => p === "movimentos");
      if (pathIndex !== -1) {
        const filePath = urlParts.slice(pathIndex).join("/");
        filePaths.push(filePath);
      }
    }

    if (filePaths.length > 0) {
      await supabase.storage.from(BUCKET_NAME).remove(filePaths);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("vx_fin_anexo")
      .delete()
      .eq("id_movimento", movimentoId);

    if (deleteError) throw deleteError;
  } catch (error) {
    console.error("Error deleting attachments:", error);
    // Don't throw - let the movement deletion continue even if attachment cleanup fails
  }
}

/**
 * Delete attachments for multiple movements (batch operation)
 */
export async function deleteAnexosDeMovimentos(movimentoIds: string[]): Promise<void> {
  for (const id of movimentoIds) {
    await deleteAnexosDoMovimento(id);
  }
}
