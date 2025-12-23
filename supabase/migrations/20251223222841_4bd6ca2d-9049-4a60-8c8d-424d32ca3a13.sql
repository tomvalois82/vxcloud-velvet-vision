
-- Recriar a view vw_investidor_carteira com a lógica correta
DROP VIEW IF EXISTS vw_investidor_carteira;

CREATE VIEW vw_investidor_carteira AS
SELECT 
    p.id AS id_pessoa,
    p.nome,
    -- Alocado: soma de vx_investimento.valor_investido onde data_finalizado é null
    COALESCE((
        SELECT SUM(i.valor_investido)
        FROM vx_investimento i
        WHERE i.id_pessoa = p.id AND i.data_finalizado IS NULL
    ), 0) AS alocado,
    -- Saldo em Carteira: soma de todos os registros de vx_investimento_carteira.valor
    COALESCE((
        SELECT SUM(c.valor)
        FROM vx_investimento_carteira c
        WHERE c.id_pessoa = p.id
    ), 0) AS carteira,
    -- Solicitado: mantém a lógica anterior para compatibilidade
    0::numeric AS solicitado,
    -- Total: Alocado + Saldo em Carteira
    COALESCE((
        SELECT SUM(i.valor_investido)
        FROM vx_investimento i
        WHERE i.id_pessoa = p.id AND i.data_finalizado IS NULL
    ), 0) + COALESCE((
        SELECT SUM(c.valor)
        FROM vx_investimento_carteira c
        WHERE c.id_pessoa = p.id
    ), 0) AS total
FROM vx_pessoa p
WHERE p.eh_investidor = true;
