-- Adicionar campos para suportar lançamentos recorrentes
ALTER TABLE public.vx_fin_movimento 
ADD COLUMN IF NOT EXISTS recorrencia_id uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ordem_ocorrencia integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_ocorrencias integer DEFAULT NULL;

-- Criar índice para consultas de recorrência
CREATE INDEX IF NOT EXISTS idx_vx_fin_movimento_recorrencia ON public.vx_fin_movimento(recorrencia_id) WHERE recorrencia_id IS NOT NULL;