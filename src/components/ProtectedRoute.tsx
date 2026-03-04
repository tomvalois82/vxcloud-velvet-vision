import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/useAccessControl';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: accessLoading } = useAccessControl();
  const location = useLocation();
  const navigate = useNavigate();

  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check access for current path (skip for config pages to avoid locking out)
  const path = location.pathname;
  const isConfigPage = path.startsWith('/configuracoes');
  
  if (!isConfigPage && !hasAccess(path)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          <button onClick={() => navigate(-1)} className="text-accent underline">Voltar à página anterior</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
