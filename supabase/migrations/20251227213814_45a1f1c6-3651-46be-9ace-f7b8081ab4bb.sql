-- Função para verificar se o usuário atual é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario
    WHERE auth_id = auth.uid()
      AND superadm = true
  )
$$;

-- Função para obter o id_config do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_config_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT config
  FROM public.usuario
  WHERE auth_id = auth.uid()
  LIMIT 1
$$;

-- Habilitar RLS na tabela empresa (se ainda não estiver)
ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Super admins can do everything on empresa" ON public.empresa;
DROP POLICY IF EXISTS "Users can view their own empresa" ON public.empresa;

-- Política para super admins: podem fazer tudo
CREATE POLICY "Super admins can do everything on empresa"
ON public.empresa
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Política para usuários comuns: podem ver apenas a empresa vinculada ao seu config
CREATE POLICY "Users can view their own empresa"
ON public.empresa
FOR SELECT
TO authenticated
USING (id_config = public.get_user_config_id());