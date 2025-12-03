-- Adicionar campo saldo na tabela vx_fin_conta
ALTER TABLE public.vx_fin_conta
ADD COLUMN saldo numeric NOT NULL DEFAULT 0;