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
          <div className="mx-auto mb-3 inline-flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 8, background: '#C8845A' }}>
            <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
              <rect x="2" y="5" width="18" height="13" rx="2" stroke="white" strokeWidth="1.6" />
              <line x1="2" y1="9" x2="20" y2="9" stroke="white" strokeWidth="1.6" />
              <line x1="7" y1="5" x2="7" y2="9" stroke="white" strokeWidth="1.6" />
              <circle cx="11" cy="14" r="2" fill="white" />
            </svg>
          </div>
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
            <Input
              type="password"
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
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
