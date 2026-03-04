import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AccessControl {
  cargo: string | null;
  allowedPages: string[];
  loading: boolean;
  hasAccess: (path: string) => boolean;
}

export function useAccessControl(): AccessControl {
  const { user } = useAuth();
  const [cargo, setCargo] = useState<string | null>(null);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccess() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // 1. Get user cargo
        const { data: usuario, error: userError } = await supabase
          .from('usuario')
          .select('cargo, superadm')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (userError) {
          console.error('Erro ao buscar cargo do usuário:', userError);
          setLoading(false);
          return;
        }

        // Super admins have access to everything
        if (usuario?.superadm === true) {
          setCargo(usuario?.cargo ?? null);
          setAllowedPages(['*']);
          setLoading(false);
          return;
        }

        const userCargo = usuario?.cargo;
        setCargo(userCargo ?? null);

        if (!userCargo) {
          setAllowedPages([]);
          setLoading(false);
          return;
        }

        // 2. Get permissions for this cargo
        const { data: permissoes, error: permError } = await supabase
          .from('vx_acesso_paginas')
          .select('pagina, permitido')
          .eq('cargo', userCargo);

        if (permError) {
          console.error('Erro ao buscar permissões:', permError);
          setAllowedPages([]);
        } else {
          const allowed = (permissoes || [])
            .filter(p => p.permitido)
            .map(p => p.pagina);
          setAllowedPages(allowed);
        }
      } catch (error) {
        console.error('Erro no controle de acesso:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAccess();
  }, [user?.id]);

  const hasAccess = (path: string): boolean => {
    // Still loading — allow (will be checked again)
    if (loading) return true;
    // Super admin
    if (allowedPages.includes('*')) return true;
    // No cargo set or no permissions configured — allow all (backwards compatible)
    if (!cargo || allowedPages.length === 0) return true;
    // Check exact match or parent path match for sub-routes
    // e.g. /vendas/nova should be allowed if /vendas is allowed
    return allowedPages.some(allowed => {
      if (path === allowed) return true;
      // Sub-route match: /vendas/nova matches /vendas, /financeiro/fast matches /financeiro
      if (path.startsWith(allowed + '/')) return true;
      return false;
    });
  };

  return { cargo, allowedPages, loading, hasAccess };
}
