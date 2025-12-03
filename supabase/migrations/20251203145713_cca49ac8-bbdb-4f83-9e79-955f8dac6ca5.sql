-- Adicionar campos opcionais para baixa de títulos
ALTER TABLE public.vx_fin_movimento
ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS acrescimo numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS motivo_ajuste text;

-- Comentários descritivos
COMMENT ON COLUMN public.vx_fin_movimento.desconto IS 'Valor de desconto aplicado na baixa';
COMMENT ON COLUMN public.vx_fin_movimento.acrescimo IS 'Valor de acréscimo aplicado na baixa';
COMMENT ON COLUMN public.vx_fin_movimento.motivo_ajuste IS 'Motivo do desconto ou acréscimo na baixa';