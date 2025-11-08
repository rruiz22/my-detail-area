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
import { useCurrentYear } from '@/hooks/useCurrentYear';

// Password validation
const validatePassword = (password: string) => {
  const checks = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const score = Object.values(checks).filter(Boolean).length;
  // Require: length (6+), uppercase, lowercase, number (special is optional)
  return { checks, score, isValid: checks.length && checks.uppercase && checks.lowercase && checks.number };
};

export default function ResetPassword() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [tokenVerified, setTokenVerified] = useState(false); // Track if token already verified
  const { updatePassword, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { branding } = useAuthBranding();
  const [searchParams] = useSearchParams();
  const currentYear = useCurrentYear();

  // Check if user has a valid recovery session
  // Verify the OTP token from the URL (ONLY ONCE)
  useEffect(() => {
    // Skip if already verified or if we already have a session
    if (tokenVerified || session) {
      console.log('⏭️ Skipping token verification:', { tokenVerified, hasSession: !!session });
      setVerifyingSession(false);
      return;
    }

    const verifyRecoverySession = async () => {
      console.log('🔐 Verifying recovery session...');
      console.log('🔍 URL params:', {
        token: searchParams.get('token'),
        token_hash: searchParams.get('token_hash'),
        code: searchParams.get('code'),
        type: searchParams.get('type'),
        all: window.location.search
      });

      // Supabase can send different parameter names depending on configuration
      // Check for: token_hash (PKCE flow), token (magic link), or code (legacy)
      const tokenHash = searchParams.get('token_hash');
      const token = searchParams.get('token');
      const code = searchParams.get('code');
      const type = searchParams.get('type');

      // Use whichever parameter is present
      const recoveryToken = tokenHash || token || code;

      if (recoveryToken && !tokenVerified) {
        console.log('📧 Recovery token found in URL:', {
          paramName: tokenHash ? 'token_hash' : token ? 'token' : 'code',
          tokenPreview: recoveryToken.substring(0, 10) + '...',
          type: type
        });

        // Mark as verified immediately to prevent multiple calls
        setTokenVerified(true);

        try {
          // Try to verify the OTP token with Supabase
          // For password recovery, we use verifyOtp with token_hash parameter
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: recoveryToken,
            type: 'recovery',
          });

          if (error) {
            console.error('❌ Token verification failed:', error);
            console.error('Error details:', {
              message: error.message,
              status: error.status,
              name: error.name
            });
            setError(t('auth.reset_password.invalid_session', 'Invalid or expired reset link. Please request a new one.'));
            setTokenVerified(false); // Allow retry if verification fails
          } else if (data.session) {
            console.log('✅ Recovery session established successfully');
            console.log('Session details:', {
              user: data.user?.email,
              expiresAt: data.session.expires_at
            });
            // Session is now established, user can proceed
          } else {
            console.error('❌ No session returned from token verification');
            console.log('Response data:', data);
            setError(t('auth.reset_password.invalid_session', 'Invalid or expired reset link. Please request a new one.'));
            setTokenVerified(false); // Allow retry if no session
          }
        } catch (err) {
          console.error('❌ Unexpected error during token verification:', err);
          setError(t('auth.reset_password.invalid_session', 'Invalid or expired reset link. Please request a new one.'));
          setTokenVerified(false); // Allow retry on unexpected error
        }
      } else if (!session && !recoveryToken) {
        // No token in URL and no existing session
        console.error('❌ No recovery token or session found');
        console.log('Available URL params:', Array.from(searchParams.entries()));
        setError(t('auth.reset_password.invalid_session', 'Invalid or expired reset link. Please request a new one.'));
      } else if (session) {
        console.log('✅ Existing session found, no token needed');
      }

      setVerifyingSession(false);
    };

    verifyRecoverySession();
  }, [searchParams, session, tokenVerified, t]);

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
                              {t('auth.signup.password_length', 'At least 6 characters')}
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
          <p>{t('auth.footer_text', { year: currentYear })} {getFormattedVersion()}</p>
        </footer>
      </main>
    </div>
  );
}
