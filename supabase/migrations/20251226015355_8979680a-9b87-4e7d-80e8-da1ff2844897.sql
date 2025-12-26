-- Recriar a view vw_investidor_carteira com security_invoker = true
-- para herdar as políticas RLS das tabelas subjacentes

DROP VIEW IF EXISTS public.vw_investidor_carteira;

CREATE VIEW public.vw_investidor_carteira
WITH (security_invoker = true)
AS
SELECT 
    p.id AS id_pessoa,
    p.nome,
    COALESCE(
        (SELECT sum(i.valor_investido) 
         FROM vx_investimento i
         WHERE i.id_pessoa = p.id AND i.data_finalizado IS NULL), 
        0::numeric
    ) AS alocado,
    COALESCE(
        (SELECT sum(c.valor) 
         FROM vx_investimento_carteira c
         WHERE c.id_pessoa = p.id), 
        0::numeric
    ) AS carteira,
    0::numeric AS solicitado,
    COALESCE(
        (SELECT sum(i.valor_investido) 
         FROM vx_investimento i
         WHERE i.id_pessoa = p.id AND i.data_finalizado IS NULL), 
        0::numeric
    ) + COALESCE(
        (SELECT sum(c.valor) 
         FROM vx_investimento_carteira c
         WHERE c.id_pessoa = p.id), 
        0::numeric
    ) AS total
FROM vx_pessoa p
WHERE p.eh_investidor = true;