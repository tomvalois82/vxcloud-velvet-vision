import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSuperUser() {
  const { user } = useAuth();
  const [isSuperUser, setIsSuperUser] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSuperUser() {
      if (!user?.id) {
        setIsSuperUser(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('usuario')
          .select('superadm')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar super usuário:', error);
          setIsSuperUser(false);
        } else {
          setIsSuperUser(data?.superadm === true);
        }
      } catch (error) {
        console.error('Erro ao verificar super usuário:', error);
        setIsSuperUser(false);
      } finally {
        setLoading(false);
      }
    }

    checkSuperUser();
  }, [user?.id]);

  return { isSuperUser, loading };
}
