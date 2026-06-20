import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BrandLogo } from '@/components/Brand';
import { Eye, EyeOff } from 'lucide-react';
import { lovable } from '@/integrations/lovable';


const RELATIONSHIP_KEYS = [
  'father','mother','grandparent','uncle','cousin','greatGrandparent','godparent','sibling','other',
];

export default function Auth() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite') || '';
  const inviteEmail = searchParams.get('email') || '';

  const [isLogin, setIsLogin] = useState(!inviteCode);
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleGoogle = async () => {
    setLoading(true);
    try {
      if (inviteCode) {
        sessionStorage.setItem('pending_invite_code', inviteCode);
      }
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: t('common.error'), description: t('auth.enterEmailFirst', 'Please enter your email first'), variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://memorydrawer.app/reset-password',
      });
      if (error) throw error;
      toast({ title: t('auth.resetEmailSent', 'Email sent'), description: t('auth.resetEmailSentDesc', 'Check your inbox for the reset link.') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!relationship) {
          toast({ title: t('common.error'), description: t('auth.selectRelationshipError'), variant: 'destructive' });
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
          title: t('auth.checkEmail'),
          description: t('auth.confirmationSent'),
        });
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full bg-sky/20 blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-border/60 shadow-elevated rounded-2xl">
        <CardHeader className="text-center pb-4">
          <BrandLogo size={56} className="mx-auto mb-3" />
          <CardTitle className="text-3xl tracking-tight" style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>
            <span style={{ color: '#4A3728' }}>memory</span><span style={{ color: '#C8845A' }}>drawer</span>
          </CardTitle>
          <CardDescription className="mt-1">
            {inviteCode
              ? t('auth.invitedTitle')
              : isLogin
                ? t('auth.loginSubtitle')
                : t('auth.signupSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-1">
                  <Label className="text-sm">{t('auth.yourName')}</Label>
                  <Input
                    placeholder={t('auth.fullNamePlaceholder')}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t('auth.whoAreYou')}</Label>
                  <Select value={relationship} onValueChange={setRelationship}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('auth.selectRelationship')} />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_KEYS.map(k => (
                        <SelectItem key={k} value={t(`relationships.${k}`)}>{t(`relationships.${k}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Input
              type="email"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('auth.hidePassword', 'Ocultar contraseña') : t('auth.showPassword', 'Mostrar contraseña')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isLogin && (
              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs hover:underline"
                  style={{ color: '#C8845A' }}
                >
                  {t('auth.forgotPassword', '¿Olvidaste tu contraseña?')}
                </button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('auth.loading') : isLogin ? t('auth.login') : t('auth.signup')}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueWith', 'o continúa con')}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-md border border-[#dadce0] bg-white text-[#3c4043] font-medium text-sm hover:bg-[#f8f9fa] transition-colors disabled:opacity-60"
            style={{ fontFamily: 'Roboto, Arial, sans-serif' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
            </svg>
            {t('auth.continueWithGoogle', 'Continuar con Google')}
          </button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? t('auth.signUpLink') : t('auth.loginLink')}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
