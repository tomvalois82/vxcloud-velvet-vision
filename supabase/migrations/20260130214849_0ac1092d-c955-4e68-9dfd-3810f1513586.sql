-- Correção da função fn_rateio_custo_veiculo_carteira
-- O problema atual: ao fazer UPDATE em qualquer movimento 'Pagar', a função deleta 
-- TODOS os registros da carteira vinculados, mesmo que não sejam do tipo "Custo Pós-Venda"
-- 
-- Correção: Só deletar registros que foram criados por esta trigger (identificados pela descrição)
-- e apenas quando relevante para a lógica de rateio de custos pós-venda

CREATE OR REPLACE FUNCTION public.fn_rateio_custo_veiculo_carteira()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_investidor RECORD;
    v_valor_liquido_original DECIMAL(15,2);
    v_valor_proporcional DECIMAL(15,2);
    v_venda_fechada BOOLEAN;
BEGIN
    -- CORREÇÃO: Só deleta registros de "Custo Pós-Venda" criados por esta trigger
    -- Isso evita deletar outros tipos de lançamentos na carteira (aportes, retiradas manuais, etc.)
    IF (TG_OP = 'UPDATE' AND OLD.tipo_movimento = 'Pagar' AND OLD.id_estoque IS NOT NULL) THEN
        DELETE FROM vx_investimento_carteira 
        WHERE id_movimento = OLD.id 
          AND descricao LIKE 'Custo Pós-Venda:%';
    END IF;

    -- PASSO 1: Verificar se é 'Pagar' e se possui id_estoque
    IF NEW.tipo_movimento = 'Pagar' AND NEW.id_estoque IS NOT NULL THEN
        
        -- Verificar se a venda do veículo está fechada
        SELECT fechada INTO v_venda_fechada 
        FROM vx_vendas 
        WHERE id_veiculo_vendido = NEW.id_estoque 
        LIMIT 1;

        -- Só aciona se a venda estiver fechada
        IF v_venda_fechada = TRUE THEN
            v_valor_liquido_original := COALESCE(NEW.valor_bruto, 0) - COALESCE(NEW.desconto, 0) + COALESCE(NEW.acrescimo, 0);

            FOR v_investidor IN 
                SELECT id_pessoa, percentual_investido 
                FROM vx_investimento 
                WHERE id_estoque = NEW.id_estoque 
                  AND data_finalizado IS NOT NULL
            LOOP
                v_valor_proporcional := ROUND((v_valor_liquido_original * (v_investidor.percentual_investido / 100)), 2) * -1;

                IF v_valor_proporcional != 0 THEN
                    INSERT INTO vx_investimento_carteira (
                        id_pessoa, id_movimento, id_estoque, descricao, valor, data
                    ) VALUES (
                        v_investidor.id_pessoa, NEW.id, NEW.id_estoque,
                        'Custo Pós-Venda: ' || NEW.descricao, v_valor_proporcional, NEW.data_compra
                    );
                END IF;
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;