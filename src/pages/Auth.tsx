import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

// Security utility functions
const sanitizeInput = (input: string) => {
  return input.trim().replace(/[<>]/g, '');
};

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score, isValid: score >= 4 };
};

export default function Auth() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Redirect if already authenticated
  if (user) {
    const redirectTo = searchParams.get('redirect');
    // If redirect parameter exists and is a valid route, use it; otherwise default to /dashboard
    const destination = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs before submission
    const sanitizedEmail = sanitizeInput(email);
    
    if (!validateEmail(sanitizedEmail)) {
      toast({
        title: t('auth.invalid_email_title'),
        description: t('auth.invalid_email_description'),
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await signIn(sanitizedEmail, password);

      if (error) {
        let errorMessage = error.message;
        
        // Provide helpful error messages
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = t('auth.invalid_credentials');
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = t('auth.email_not_confirmed');
        }

        toast({
          title: t('auth.sign_in_error_title'),
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('auth.error_title'),
        description: t('auth.unexpected_error'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Top right controls */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Left Column: Login Form */}
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md animate-fade-in">
        {/* Logo and Brand Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight drop-shadow-lg dark:drop-shadow-xl" style={{
            textShadow: 'var(--text-shadow, 2px 2px 4px rgba(0, 0, 0, 0.3), 0px 0px 8px rgba(0, 0, 0, 0.1))'
          }}>
            {t('auth.app_title', 'My Detail Area')}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('auth.app_subtitle', 'Dealership Operations Platform')}
          </p>
        </div>

        <Card className="card-enhanced border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-foreground mb-2">
              {t('auth.welcome_title', 'Welcome back')}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t('auth.welcome_subtitle', 'Sign in to your account')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  {t('auth.email_label', 'Email address')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(sanitizeInput(e.target.value))}
                  maxLength={100}
                  required
                  className="input-enhanced h-11 border-border/50 focus:border-accent transition-colors"
                  placeholder={t('auth.email_placeholder', 'Enter your email address')}
                />
                {email && !validateEmail(email) && (
                  <Alert variant="destructive" className="py-2">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {t('auth.invalid_email_description')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  {t('auth.password_label', 'Password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-enhanced h-11 border-border/50 focus:border-accent transition-colors"
                  placeholder={t('auth.password_placeholder', 'Enter your password')}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 button-enhanced bg-gradient-primary hover:bg-gradient-primary/90 text-primary-foreground font-medium text-base" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('auth.signing_in', 'Signing in...')}
                  </div>
                ) : (
                  t('auth.sign_in_button', 'Sign In')
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('auth.no_access_text', "Don't have access? Contact your dealer administrator.")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>{t('auth.footer_text', '© 2024 My Detail Area. Dealership operations platform.')}</p>
        </div>
          </div>
        </div>

        {/* Right Column: Pitch Deck */}
        <div className="hidden lg:flex items-center justify-center p-8 bg-gradient-to-br from-primary/5 to-accent/10 dark:from-primary/10 dark:to-accent/20">
          <div className="w-full max-w-lg">
            <div className="text-center space-y-8">
              {/* Tagline */}
              <div className="animate-tagline-entrance">
                <h2 className="text-4xl font-bold text-foreground mb-4 tracking-tight" style={{
                  textShadow: 'var(--text-shadow)'
                }}>
                  {t('auth.tagline', 'From Detail to sold—')}
                  <span className="relative inline-block tagline-faster">
                    {t('auth.tagline_faster', 'faster')}
                    <span className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-accent to-primary animate-underline-sweep"></span>
                  </span>
                </h2>
              </div>

              {/* Value Proposition */}
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 shadow-elegant border border-border/50">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('auth.value_proposition', 'The operational platform that connects recon, detail, service and sales to move every vehicle from intake to sale with less friction and better visibility.')}
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 hover:bg-card/80 transition-all duration-300">
                  <div className="text-2xl">🔎</div>
                  <span className="text-base font-medium text-foreground">{t('auth.feature_visibility', 'Real-time visibility')}</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 hover:bg-card/80 transition-all duration-300">
                  <div className="text-2xl">⚙️</div>
                  <span className="text-base font-medium text-foreground">{t('auth.feature_workflow', 'Standardized workflow')}</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 hover:bg-card/80 transition-all duration-300">
                  <div className="text-2xl">📈</div>
                  <span className="text-base font-medium text-foreground">{t('auth.feature_performance', 'Reduced T2L, faster turnover')}</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="text-center pt-4 border-t border-border/30">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">info@mydetailarea.com</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}