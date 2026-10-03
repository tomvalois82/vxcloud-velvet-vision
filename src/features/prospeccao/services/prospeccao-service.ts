import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Prospeccao = Database['public']['Tables']['prospeccao_compra']['Row'];
export type ProspeccaoInsert = Database['public']['Tables']['prospeccao_compra']['Insert'];
export type PlataformaCompra = Database['public']['Enums']['plataformas_compra'];

export const PLATAFORMAS: PlataformaCompra[] = [
  'Autoavaliar', 'Localiza', 'Valoriza +', 'OLX', 'Particular', 'Leilão', 'Outros',
];
export const COMBUSTIVEIS = ['Gasolina', 'Etanol', 'Flex', 'GNV', 'Diesel', 'Híbrido', 'Elétrico'];
export const LAUDOS = ['Aprovado', 'Com Apontamento', 'Reprovado'];
export const STATUS_PROSPECCAO = ['Em andamento', 'Perdido', 'Cancelado'];
export const TIPOS_VEICULO = [
  { value: 'carros', label: 'Carros' },
  { value: 'motos', label: 'Motos' },
  { value: 'caminhoes', label: 'Caminhões' },
];

const BUCKET = 'car-fotos';

// Busca o usuário logado (id e config)
export async function buscarUsuarioLogado(): Promise<{ id: number; config: number | null } | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from('usuario')
    .select('id, config')
    .eq('auth_id', auth.user.id)
    .maybeSingle();
  return data ? { id: data.id, config: data.config } : null;
}

export async function listarProspeccoes(config: number | null): Promise<Prospeccao[]> {
  let query = supabase.from('prospeccao_compra').select('*').order('data_hora_fim', { ascending: true, nullsFirst: false });
  if (config) query = query.eq('config', config);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function salvarProspeccao(dados: ProspeccaoInsert, id?: number): Promise<void> {
  if (id) {
    const { error } = await supabase.from('prospeccao_compra').update(dados).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('prospeccao_compra').insert(dados);
    if (error) throw error;
  }
}

export async function excluirProspeccao(id: number): Promise<void> {
  const { error } = await supabase.from('prospeccao_compra').delete().eq('id', id);
  if (error) throw error;
}

// Envia arquivo (foto ou laudo) para o storage e retorna a URL pública
export async function enviarArquivo(arquivo: File, pasta: 'fotos' | 'laudos'): Promise<string> {
  const extensao = arquivo.name.split('.').pop() ?? 'bin';
  const caminho = `prospeccao/${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, { upsert: false });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}
