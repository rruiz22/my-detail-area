import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Check, X, CheckCircle2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthBranding } from '@/hooks/useAuthBranding';
import { getFormattedVersion } from '@/config/version';
import { supabase } from '@/integrations/supabase/client';

// Password validation
const validatePassword = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score, isValid: score >= 5 };
};

export default function ResetPassword() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const { updatePassword, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { branding } = useAuthBranding();
  const [searchParams] = useSearchParams();

  // Check if user has a valid recovery session
  // Verify the OTP token from the URL
  useEffect(() => {
    const verifyRecoverySession = async () => {
      console.log('🔐 Verifying recovery session...');
      
      // Check if there's a token_hash in the URL (from email link)
      const tokenHash = searchParams.get('token_hash') || searchParams.get('code');
      const type = searchParams.get('type');
      
      if (tokenHash) {
        console.log('📧 Recovery token found in URL, verifying with Supabase...');
        
        try {
          // Verify the OTP token with Supabase
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type === 'recovery' ? 'recovery' : 'email') as any,
          });
          
          if (error) {
            console.error('❌ Token verification failed:', error.message);
            setError(t('auth.reset_password.invalid_session', 'Invalid or expired reset link. Please request a new one.'));
          } else if (data.session) {
            console.log('✅ Recovery session established successfully');
            // Session is now established, user can proceed
          } else {
            console.error('❌ No session returned from token verification');
            setError(t('auth.reset_password.invalid_session', 'Invalid or expired reset link. Please request a new one.'));
          }
        } catch (err) {
          console.error('❌ Unexpected error during token verification:', err);
          setError(t('auth.reset_password.invalid_session', 'Invalid or expired reset link. Please request a new one.'));
        }
      } else if (!session) {
        // No code in URL and no session
        console.error('❌ No recovery token or session found');
        setError(t('auth.reset_password.invalid_session', 'Invalid or expired reset link. Please request a new one.'));
      }
      
      setVerifyingSession(false);
    };
    
    verifyRecoverySession();
  }, [searchParams, session, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: t('auth.signup.password_weak_title', 'Weak Password'),
        description: t('auth.signup.password_requirements', 'Password must meet all requirements'),
        variant: "destructive",
      });
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      toast({
        title: t('auth.reset_password.passwords_dont_match_title', 'Passwords Don\'t Match'),
        description: t('auth.reset_password.passwords_dont_match_description', 'Please make sure both passwords are the same'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await updatePassword(password);

      if (updateError) {
        console.error('[RESET PASSWORD] Error:', updateError.message);
        toast({
          title: t('auth.reset_password.error_title', 'Reset Failed'),
          description: updateError.message,
          variant: "destructive",
        });
      } else {
        setSuccess(true);
        toast({
          title: t('auth.reset_password.success_title', 'Password Updated'),
          description: t('auth.reset_password.success_description', 'Your password has been successfully updated'),
          variant: "default",
        });

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    } catch (error) {
      console.error('[RESET PASSWORD] Unexpected error:', error);
      toast({
        title: t('auth.error_title', 'Error'),
        description: t('auth.unexpected_error', 'An unexpected error occurred'),
        variant: "destructive",
      });
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
              {t('auth.reset_password.title', 'Create New Password')}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t('auth.reset_password.subtitle', 'Enter your new password below')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {verifyingSession ? (
              // Verifying Session State
              <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" aria-hidden="true" />
                  <span className="text-muted-foreground">{t('auth.reset_password.verifying', 'Verifying reset link...')}</span>
                </div>
              </div>
            ) : error ? (
              // Error State - Invalid/Expired Link
              <div className="text-center py-6 space-y-4">
                <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
                <Button
                  onClick={() => navigate('/forgot-password')}
                  variant="outline"
                  className="w-full"
                >
                  {t('auth.reset_password.request_new_link', 'Request New Reset Link')}
                </Button>
              </div>
            ) : success ? (
              // Success State
              <div className="text-center py-6 space-y-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {t('auth.reset_password.success_title', 'Password Updated!')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.reset_password.redirecting', 'Redirecting to login...')}
                  </p>
                </div>
              </div>
            ) : (
              // Form State
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                    {t('auth.reset_password.new_password_label', 'New Password')}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-required="true"
                    className="h-11 bg-background dark:bg-muted/10 border-border dark:border-border/60 focus:border-accent dark:focus:border-accent text-foreground transition-colors"
                    placeholder={t('auth.reset_password.new_password_placeholder', 'Enter your new password')}
                    autoFocus
                  />

                  {/* Password strength indicator */}
                  {password && (
                    <div className="space-y-1" aria-live="polite" aria-atomic="true">
                      {(() => {
                        const validation = validatePassword(password);
                        return (
                          <div className="text-xs space-y-1">
                            <div className={`flex items-center gap-2 ${validation.checks.length ? 'text-emerald-500' : 'text-red-500'}`}>
                              {validation.checks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              {t('auth.signup.password_length', 'At least 8 characters')}
                            </div>
                            <div className={`flex items-center gap-2 ${validation.checks.uppercase ? 'text-emerald-500' : 'text-red-500'}`}>
                              {validation.checks.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              {t('auth.signup.password_uppercase', 'One uppercase letter')}
                            </div>
                            <div className={`flex items-center gap-2 ${validation.checks.lowercase ? 'text-emerald-500' : 'text-red-500'}`}>
                              {validation.checks.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              {t('auth.signup.password_lowercase', 'One lowercase letter')}
                            </div>
                            <div className={`flex items-center gap-2 ${validation.checks.number ? 'text-emerald-500' : 'text-red-500'}`}>
                              {validation.checks.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              {t('auth.signup.password_number', 'One number')}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
                    {t('auth.reset_password.confirm_password_label', 'Confirm Password')}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    aria-required="true"
                    className="h-11 bg-background dark:bg-muted/10 border-border dark:border-border/60 focus:border-accent dark:focus:border-accent text-foreground transition-colors"
                    placeholder={t('auth.reset_password.confirm_password_placeholder', 'Confirm your new password')}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500">
                      {t('auth.reset_password.passwords_dont_match_description', 'Passwords do not match')}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary dark:bg-accent hover:bg-primary/90 dark:hover:bg-accent/90 text-primary-foreground dark:text-accent-foreground font-medium text-base shadow-lg"
                  disabled={loading || !session}
                  aria-busy={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                      {t('auth.reset_password.updating', 'Updating...')}
                    </div>
                  ) : (
                    t('auth.reset_password.update_password_button', 'Update Password')
                  )}
                </Button>
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
