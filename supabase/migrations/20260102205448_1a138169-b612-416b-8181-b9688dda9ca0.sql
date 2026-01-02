-- Create or replace view with investor rentability percentage
-- This allows the frontend to fetch the already-calculated lucro_proporcional_percentual
CREATE OR REPLACE VIEW public.vw_rentabilidade_investidor AS
SELECT
  p.id AS id_pessoa,
  p.nome,
  p.cpf_cnpj,
  COALESCE(SUM(i.valor_investido), 0)::numeric AS total_investido,
  COALESCE(SUM(i.valor_lucro), 0)::numeric AS total_lucro,
  CASE
    WHEN COALESCE(SUM(i.valor_investido), 0) > 0
      THEN (COALESCE(SUM(i.valor_lucro), 0) / COALESCE(SUM(i.valor_investido), 0)) * 100
    ELSE 0
  END::numeric AS lucro_proporcional_percentual
FROM public.vx_pessoa p
LEFT JOIN public.vx_investimento i
  ON i.id_pessoa = p.id
  AND i.data_finalizado IS NULL
GROUP BY p.id, p.nome, p.cpf_cnpj;
