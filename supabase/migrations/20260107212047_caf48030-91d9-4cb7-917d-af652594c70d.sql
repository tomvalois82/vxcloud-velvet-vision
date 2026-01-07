-- Trigger function para sincronizar saldo da conta baseado em mudanças no vx_fin_movimento
CREATE OR REPLACE FUNCTION public.sync_conta_saldo()
RETURNS TRIGGER AS $$
DECLARE
  v_valor_liquido NUMERIC;
  v_tipo_movimento VARCHAR;
  v_id_conta UUID;
  v_status VARCHAR;
BEGIN
  -- Para INSERT: só atualiza saldo se o novo registro estiver 'Pago'
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'Pago' AND NEW.id_conta IS NOT NULL THEN
      v_valor_liquido := COALESCE(NEW.valor_liquido, 0);
      
      IF NEW.tipo_movimento = 'Receber' THEN
        -- Receita: soma ao saldo
        UPDATE vx_fin_conta 
        SET saldo = saldo + v_valor_liquido 
        WHERE id = NEW.id_conta;
      ELSIF NEW.tipo_movimento = 'Pagar' THEN
        -- Despesa: subtrai do saldo
        UPDATE vx_fin_conta 
        SET saldo = saldo - v_valor_liquido 
        WHERE id = NEW.id_conta;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Para UPDATE: verifica mudanças de status ou conta
  IF TG_OP = 'UPDATE' THEN
    -- Caso 1: Status mudou de 'Pendente' para 'Pago' (Baixa)
    IF OLD.status = 'Pendente' AND NEW.status = 'Pago' AND NEW.id_conta IS NOT NULL THEN
      v_valor_liquido := COALESCE(NEW.valor_liquido, 0);
      
      IF NEW.tipo_movimento = 'Receber' THEN
        UPDATE vx_fin_conta 
        SET saldo = saldo + v_valor_liquido 
        WHERE id = NEW.id_conta;
      ELSIF NEW.tipo_movimento = 'Pagar' THEN
        UPDATE vx_fin_conta 
        SET saldo = saldo - v_valor_liquido 
        WHERE id = NEW.id_conta;
      END IF;
    
    -- Caso 2: Status mudou de 'Pago' para 'Pendente' (Estorno)
    ELSIF OLD.status = 'Pago' AND NEW.status = 'Pendente' AND OLD.id_conta IS NOT NULL THEN
      v_valor_liquido := COALESCE(OLD.valor_liquido, 0);
      
      IF OLD.tipo_movimento = 'Receber' THEN
        -- Estorno de receita: subtrai do saldo
        UPDATE vx_fin_conta 
        SET saldo = saldo - v_valor_liquido 
        WHERE id = OLD.id_conta;
      ELSIF OLD.tipo_movimento = 'Pagar' THEN
        -- Estorno de despesa: soma ao saldo
        UPDATE vx_fin_conta 
        SET saldo = saldo + v_valor_liquido 
        WHERE id = OLD.id_conta;
      END IF;
    
    -- Caso 3: Registro continua 'Pago' mas conta ou valor mudou
    ELSIF OLD.status = 'Pago' AND NEW.status = 'Pago' THEN
      -- Reverter saldo da conta antiga
      IF OLD.id_conta IS NOT NULL THEN
        v_valor_liquido := COALESCE(OLD.valor_liquido, 0);
        
        IF OLD.tipo_movimento = 'Receber' THEN
          UPDATE vx_fin_conta 
          SET saldo = saldo - v_valor_liquido 
          WHERE id = OLD.id_conta;
        ELSIF OLD.tipo_movimento = 'Pagar' THEN
          UPDATE vx_fin_conta 
          SET saldo = saldo + v_valor_liquido 
          WHERE id = OLD.id_conta;
        END IF;
      END IF;
      
      -- Aplicar saldo na nova conta
      IF NEW.id_conta IS NOT NULL THEN
        v_valor_liquido := COALESCE(NEW.valor_liquido, 0);
        
        IF NEW.tipo_movimento = 'Receber' THEN
          UPDATE vx_fin_conta 
          SET saldo = saldo + v_valor_liquido 
          WHERE id = NEW.id_conta;
        ELSIF NEW.tipo_movimento = 'Pagar' THEN
          UPDATE vx_fin_conta 
          SET saldo = saldo - v_valor_liquido 
          WHERE id = NEW.id_conta;
        END IF;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Para DELETE: só reverte saldo se o registro estava 'Pago'
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'Pago' AND OLD.id_conta IS NOT NULL THEN
      v_valor_liquido := COALESCE(OLD.valor_liquido, 0);
      
      IF OLD.tipo_movimento = 'Receber' THEN
        -- Deletar receita paga: subtrai do saldo
        UPDATE vx_fin_conta 
        SET saldo = saldo - v_valor_liquido 
        WHERE id = OLD.id_conta;
      ELSIF OLD.tipo_movimento = 'Pagar' THEN
        -- Deletar despesa paga: soma ao saldo
        UPDATE vx_fin_conta 
        SET saldo = saldo + v_valor_liquido 
        WHERE id = OLD.id_conta;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_sync_conta_saldo ON vx_fin_movimento;

-- Criar trigger para INSERT, UPDATE e DELETE
CREATE TRIGGER trigger_sync_conta_saldo
AFTER INSERT OR UPDATE OR DELETE ON vx_fin_movimento
FOR EACH ROW
EXECUTE FUNCTION public.sync_conta_saldo();