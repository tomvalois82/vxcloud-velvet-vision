-- Remover constraint atual que só permite valores positivos
ALTER TABLE vx_vendas_acerto DROP CONSTRAINT IF EXISTS vx_vendas_acerto_valor_check;

-- Criar nova constraint que permite positivos e negativos, mas não zero
ALTER TABLE vx_vendas_acerto ADD CONSTRAINT vx_vendas_acerto_valor_check CHECK (valor <> 0);