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
