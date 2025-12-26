import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logo-completa-transparente.png';
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
  return <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Black background layer */}
      <div className="absolute inset-0 bg-black" />
      
      {/* GIF Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70" style={{
      backgroundImage: "url(\"/lovable-uploads/2fb5db34-7c05-4c80-85a5-0203276fcaf9.png\")"
    }} />

      {/* Login Card with Glassmorphism */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="rounded-2xl p-8 border border-white/10" style={{
        background: 'rgba(15, 15, 25, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
      }}>
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <img src={logo} alt="VX Cloud" className="h-14 w-auto drop-shadow-lg" />
          </div>

          {/* Subtitle */}
          <div className="text-center mb-8">
            <p className="text-white/60 text-sm">Entre com sua conta</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80 text-sm">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 h-11" disabled={loading} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80 text-sm">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 h-11" disabled={loading} required />
            </div>

            <Button type="submit" className="w-full h-11 mt-2 bg-gradient-to-r from-primary via-purple-500 to-primary hover:opacity-90 text-white font-medium transition-all duration-300" disabled={loading}>
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