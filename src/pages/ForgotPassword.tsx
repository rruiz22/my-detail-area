import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthBranding } from '@/hooks/useAuthBranding';
import { getFormattedVersion } from '@/config/version';

// Security utility functions
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>'"&]/g, '')
    .replace(/[^\w\s@.\-]/g, '')
    .substring(0, 500);
};

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { branding } = useAuthBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedEmail = sanitizeInput(email);

    if (!validateEmail(sanitizedEmail)) {
      toast({
        title: t('auth.invalid_email_title', 'Invalid Email'),
        description: t('auth.invalid_email_description', 'Please enter a valid email address'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await resetPassword(sanitizedEmail);

      if (error) {
        console.error('[FORGOT PASSWORD] Error:', error.message);

        // Don't reveal if email exists (security best practice)
        // Always show success message
        setEmailSent(true);
      } else {
        setEmailSent(true);
      }
    } catch (error) {
      console.error('[FORGOT PASSWORD] Unexpected error:', error);
      // Still show success to prevent email enumeration
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      {/* Top right controls */}
      <header className="fixed top-4 right-4 flex items-center gap-2 z-10">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      {/* Centered Form */}
      <main className="w-full max-w-md animate-fade-in">
        {/* Logo and Brand Section */}
        <div className="text-center mb-8">
          {branding.logo_url && branding.enabled && (
            <div className="flex justify-center mb-4">
              <img
                src={branding.logo_url}
                alt={branding.title}
                className="h-16 w-auto object-contain max-w-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
            {branding.enabled && branding.title ? branding.title : t('auth.app_title', 'My Detail Area')}
          </h1>

          <p className="text-muted-foreground text-lg">
            {branding.enabled && branding.tagline ? branding.tagline : t('auth.app_subtitle', 'Dealership Operations Platform')}
          </p>
        </div>

        <Card className="border-2 border-border/20 dark:border-border/40 bg-card dark:bg-muted/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-foreground mb-2">
              {t('auth.forgot_password.title', 'Reset Your Password')}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t('auth.forgot_password.subtitle', 'Enter your email address and we\'ll send you a link to reset your password')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {emailSent ? (
              // Success State
              <div className="text-center py-6 space-y-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {t('auth.forgot_password.email_sent_title', 'Check Your Email')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.forgot_password.email_sent_description', 'If an account exists with this email, you will receive a password reset link shortly.')}
                  </p>
                  <p className="text-xs text-muted-foreground pt-2">
                    {t('auth.forgot_password.check_spam', 'Don\'t forget to check your spam folder.')}
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="w-full mt-4"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('auth.forgot_password.back_to_login', 'Back to Login')}
                </Button>
              </div>
            ) : (
              // Form State
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                    {t('auth.email_label', 'Email address')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(sanitizeInput(e.target.value))}
                    maxLength={100}
                    required
                    aria-required="true"
                    className="h-11 bg-background dark:bg-muted/10 border-border dark:border-border/60 focus:border-accent dark:focus:border-accent text-foreground transition-colors"
                    placeholder={t('auth.email_placeholder', 'Enter your email address')}
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary dark:bg-accent hover:bg-primary/90 dark:hover:bg-accent/90 text-primary-foreground dark:text-accent-foreground font-medium text-base shadow-lg"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                      {t('auth.forgot_password.sending', 'Sending...')}
                    </div>
                  ) : (
                    t('auth.forgot_password.send_reset_link', 'Send Reset Link')
                  )}
                </Button>

                <div className="text-center pt-4">
                  <Link
                    to="/auth"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t('auth.forgot_password.back_to_login', 'Back to Login')}
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>{t('auth.footer_text', '© 2024 My Detail Area. Dealership operations platform.')} {getFormattedVersion()}</p>
        </footer>
      </main>
    </div>
  );
}
