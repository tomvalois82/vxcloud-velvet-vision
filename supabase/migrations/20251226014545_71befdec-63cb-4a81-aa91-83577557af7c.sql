-- =============================================
-- Corrigir RLS: Trocar policies RESTRICTIVE por PERMISSIVE
-- =============================================

-- =============================================
-- 1. vx_pessoa
-- =============================================

-- Remover políticas existentes (restrictive)
DROP POLICY IF EXISTS "RLS_vx_pessoa" ON public.vx_pessoa;
DROP POLICY IF EXISTS "Admin_Insert_vx_pessoa" ON public.vx_pessoa;
DROP POLICY IF EXISTS "Admin_Update_vx_pessoa" ON public.vx_pessoa;
DROP POLICY IF EXISTS "Admin_Delete_vx_pessoa" ON public.vx_pessoa;

-- Criar políticas PERMISSIVE
CREATE POLICY "vx_pessoa_select_policy"
ON public.vx_pessoa
FOR SELECT
TO authenticated
USING (
  is_admin() OR ((auth.jwt() ->> 'email'::text) = (email)::text)
);

CREATE POLICY "vx_pessoa_insert_policy"
ON public.vx_pessoa
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "vx_pessoa_update_policy"
ON public.vx_pessoa
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "vx_pessoa_delete_policy"
ON public.vx_pessoa
FOR DELETE
TO authenticated
USING (is_admin());

-- =============================================
-- 2. vx_investimento
-- =============================================

-- Remover políticas existentes (restrictive)
DROP POLICY IF EXISTS "RLS_vx_investimento" ON public.vx_investimento;
DROP POLICY IF EXISTS "Admin_Insert_vx_investimento" ON public.vx_investimento;
DROP POLICY IF EXISTS "Admin_Update_vx_investimento" ON public.vx_investimento;
DROP POLICY IF EXISTS "Admin_Delete_vx_investimento" ON public.vx_investimento;

-- Criar políticas PERMISSIVE
CREATE POLICY "vx_investimento_select_policy"
ON public.vx_investimento
FOR SELECT
TO authenticated
USING (
  is_admin() OR (id_pessoa IN (
    SELECT vx_pessoa.id
    FROM vx_pessoa
    WHERE (vx_pessoa.email)::text = (auth.jwt() ->> 'email'::text)
  ))
);

CREATE POLICY "vx_investimento_insert_policy"
ON public.vx_investimento
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "vx_investimento_update_policy"
ON public.vx_investimento
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "vx_investimento_delete_policy"
ON public.vx_investimento
FOR DELETE
TO authenticated
USING (is_admin());

-- =============================================
-- 3. vx_investimento_carteira
-- =============================================

-- Remover políticas existentes (restrictive)
DROP POLICY IF EXISTS "extrato_privado_investidor" ON public.vx_investimento_carteira;
DROP POLICY IF EXISTS "Admin_Insert_vx_investimento_carteira" ON public.vx_investimento_carteira;
DROP POLICY IF EXISTS "Admin_Update_vx_investimento_carteira" ON public.vx_investimento_carteira;
DROP POLICY IF EXISTS "Admin_Delete_vx_investimento_carteira" ON public.vx_investimento_carteira;

-- Criar políticas PERMISSIVE
CREATE POLICY "vx_investimento_carteira_select_policy"
ON public.vx_investimento_carteira
FOR SELECT
TO authenticated
USING (
  is_admin() OR (id_pessoa IN (
    SELECT vx_pessoa.id
    FROM vx_pessoa
    WHERE (vx_pessoa.email)::text = (auth.jwt() ->> 'email'::text)
  ))
);

CREATE POLICY "vx_investimento_carteira_insert_policy"
ON public.vx_investimento_carteira
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "vx_investimento_carteira_update_policy"
ON public.vx_investimento_carteira
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "vx_investimento_carteira_delete_policy"
ON public.vx_investimento_carteira
FOR DELETE
TO authenticated
USING (is_admin());