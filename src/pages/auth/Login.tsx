import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
const loginSchema = z.object({
  email: z.string().trim().email({
    message: "E-mail inválido"
  }),
  password: z.string().min(6, {
    message: "A senha deve ter no mínimo 6 caracteres"
  })
});
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const {
    signIn,
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  // Redirect if already logged in
  if (user) {
    navigate('/');
    return null;
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    const result = loginSchema.safeParse({
      email,
      password
    });
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        variant: "destructive",
        title: "Erro de validação",
        description: firstError.message
      });
      return;
    }
    setLoading(true);
    const {
      error
    } = await signIn(email, password);
    if (error) {
      let errorMessage = "Erro ao fazer login. Tente novamente.";
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "E-mail ou senha incorretos.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "E-mail não confirmado. Verifique sua caixa de entrada.";
      } else if (error.message.includes("User not found")) {
        errorMessage = "Usuário não encontrado.";
      }
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: errorMessage
      });
      setLoading(false);
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando..."
      });
      navigate('/');
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md animate-fade-in">
        <div className="glass rounded-lg p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-2xl" style={{
              backgroundImage: "url(\"/lovable-uploads/0dd5e497-fbfd-41d0-bc8c-2caa18926328.png\")"
            }}>VX</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">VX Cloud</h1>
            <p className="text-muted-foreground">Entre com sua conta</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="bg-background/50 border-border text-foreground" disabled={loading} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="bg-background/50 border-border text-foreground" disabled={loading} required />
            </div>

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
              {loading ? <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </> : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>;
};
export default Login;