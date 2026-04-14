import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const ALL_RELATIONSHIPS = [
  'Padre',
  'Madre',
  'Abuelo/a',
  'Tío/a',
  'Primo/a',
  'Bisabuelo/a',
  'Padrino/Madrina',
  'Hermano/a',
  'Otro',
];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite') || '';
  const inviteEmail = searchParams.get('email') || '';

  const [isLogin, setIsLogin] = useState(!inviteCode);
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (inviteCode) {
      setIsLogin(false);
      if (inviteEmail) setEmail(inviteEmail);
    }
  }, [inviteCode, inviteEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!relationship) {
          toast({ title: 'Error', description: 'Selecciona tu parentesco', variant: 'destructive' });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, relationship, invite_code: inviteCode || undefined },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: 'Revisa tu email',
          description: 'Te hemos enviado un enlace de confirmación para verificar tu cuenta.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast({
        title: 'Falta el email',
        description: 'Introduce tu email para reenviar la confirmación.',
        variant: 'destructive',
      });
      return;
    }

    setResendingConfirmation(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      toast({
        title: 'Email reenviado',
        description: 'Te hemos vuelto a enviar el enlace de confirmación.',
      });
    } catch (error: any) {
      toast({
        title: 'No se pudo reenviar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setResendingConfirmation(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-heading">Little Moments</CardTitle>
          <CardDescription>
            {inviteCode
              ? '¡Te han invitado a un álbum familiar! Crea tu cuenta para unirte.'
              : isLogin
                ? 'Bienvenido de nuevo. Inicia sesión en tu álbum.'
                : 'Crea una cuenta para empezar el álbum familiar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-1">
                  <Label className="text-sm">Tu nombre</Label>
                  <Input
                    placeholder="Nombre completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">¿Quién eres?</Label>
                  <Select value={relationship} onValueChange={setRelationship}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu parentesco" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_RELATIONSHIPS.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cargando...' : isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>
            {isLogin && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendConfirmation}
                disabled={resendingConfirmation || loading}
              >
                {resendingConfirmation ? 'Reenviando...' : 'Reenviar email de confirmación'}
              </Button>
            )}
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
