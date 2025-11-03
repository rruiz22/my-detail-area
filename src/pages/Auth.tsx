import { useState, useEffect } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { XCircle, Check, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { formatRoleName } from '@/utils/roleUtils';
import { useAuthBranding } from '@/hooks/useAuthBranding';
import { getFormattedVersion } from '@/config/version';

// TypeScript interfaces
interface InvitationData {
  id: string;
  email: string;
  role_name: string;
  dealer_id?: number;
  dealership: {
    name: string;
  };
  invitation_token?: string;
  created_at?: string;
  expires_at?: string;
}

// Security utility functions
const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous characters while preserving valid input
  return input
    .trim()
    .replace(/[<>'"&]/g, '') // Remove HTML/script injection characters
    .replace(/[^\w\s@.\-]/g, '') // Allow only alphanumeric, spaces, email chars
    .substring(0, 500); // Enforce maximum length
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
  return { checks, score, isValid: score >= 5 }; // All 5 criteria required
};

// Rate limiting utility (brute force protection)
const rateLimiter = {
  tryAcquire: (email: string): boolean => {
    try {
      const key = `auth_attempts_${email.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      const data = stored ? JSON.parse(stored) : { count: 0, resetTime: Date.now() + 15 * 60 * 1000 };

      // Reset counter if time window expired
      if (Date.now() > data.resetTime) {
        data.count = 0;
        data.resetTime = Date.now() + 15 * 60 * 1000; // 15 minutes
      }

      // Check if limit exceeded
      if (data.count >= 5) {
        return false; // Too many attempts
      }

      // Increment counter
      data.count++;
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      // If localStorage fails, allow the attempt (fail open for UX)
      console.warn('[Rate Limiter] localStorage error:', error);
      return true;
    }
  },

  reset: (email: string): void => {
    try {
      const key = `auth_attempts_${email.toLowerCase()}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('[Rate Limiter] Failed to reset:', error);
    }
  }
};

export default function Auth() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { branding } = useAuthBranding();

  // Invitation and signup states
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  // Check for password reset token and redirect to reset password page
  useEffect(() => {
    const code = searchParams.get('code');
    const type = searchParams.get('type');
    
    // If there's a code parameter, it's likely a password reset link from Supabase email
    // Redirect to the reset password page with the full query string
    if (code && (type === 'recovery' || !type)) {
      console.log('🔐 Detected password reset token, redirecting to /reset-password');
      const fullParams = window.location.search; // Preserve all query parameters
      navigate(`/reset-password${fullParams}`, { replace: true });
      return;
    }
  }, [searchParams, navigate]);

  // Check for invitation parameters and validate token
  useEffect(() => {
    const mode = searchParams.get('mode');
    const invitation = searchParams.get('invitation');
    const emailParam = searchParams.get('email');

    if (mode === 'signup' && invitation) {
      setIsSignupMode(true);
      setInvitationLoading(true);

      // Pre-populate email if provided
      if (emailParam) {
        setEmail(emailParam);
      }

      // Verify invitation token
      verifyInvitationToken(invitation);
    } else {
      setIsSignupMode(false);
    }
  }, [searchParams]);

  const verifyInvitationToken = async (token: string) => {
    try {
      const { data, error } = await supabase
        .rpc('verify_invitation_token', {
          token_input: token
        });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !data.valid) {
        throw new Error(data?.message || t('auth.signup.invalid_token_error'));
      }

      setInvitationData(data.invitation);
      setEmail(data.invitation.email); // Set email from invitation
      setInvitationError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth.unexpected_error');
      setInvitationError(errorMessage);
      setInvitationData(null);
    } finally {
      setInvitationLoading(false);
    }
  };

  // Redirect if already authenticated
  if (user) {
    const redirectTo = searchParams.get('redirect');
    // If redirect parameter exists and is a valid route, use it; otherwise default to /dashboard
    const destination = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
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

    // Check rate limit (brute force protection)
    if (!rateLimiter.tryAcquire(sanitizedEmail)) {
      toast({
        title: t('auth.too_many_attempts_title'),
        description: t('auth.too_many_attempts_description'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(sanitizedEmail, password);

      if (error) {
        // Use generic error message to prevent email enumeration
        // Log detailed error server-side only (not shown to user)
        console.error('[AUTH] Sign-in failed:', error.message);

        toast({
          title: t('auth.sign_in_error_title'),
          description: t('auth.invalid_credentials_generic'),
          variant: "destructive",
        });
      } else {
        // Successful login - reset rate limiter for this email
        rateLimiter.reset(sanitizedEmail);
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs before submission
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedFirstName = sanitizeInput(firstName);
    const sanitizedLastName = sanitizeInput(lastName);

    if (!validateEmail(sanitizedEmail)) {
      toast({
        title: t('auth.invalid_email_title'),
        description: t('auth.invalid_email_description'),
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: t('auth.signup.password_weak_title'),
        description: t('auth.signup.password_requirements'),
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!sanitizedFirstName || !sanitizedLastName) {
      toast({
        title: t('auth.signup.required_fields_title'),
        description: t('auth.signup.required_fields_description'),
        variant: "destructive",
      });
      return;
    }

    // Check email matches invitation
    if (invitationData && sanitizedEmail !== invitationData.email) {
      toast({
        title: t('auth.signup.email_mismatch_title'),
        description: t('auth.signup.email_mismatch_description'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(sanitizedEmail, password, sanitizedFirstName, sanitizedLastName);

      if (error) {
        toast({
          title: t('auth.signup.error_title'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        // If signup successful and we have invitation, try to accept it
        if (invitationData) {
          await acceptInvitationAfterSignup();
        } else {
          toast({
            title: t('auth.signup.success_title'),
            description: t('auth.signup.check_email'),
            variant: "default",
          });
        }
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

  const acceptInvitationAfterSignup = async () => {
    try {
      const invitation = searchParams.get('invitation');
      if (!invitation) return;

      // Wait for authentication session to be established
      // This is critical because signUp doesn't immediately authenticate the user
      let attempts = 0;
      const maxAttempts = 10; // 5 seconds total (500ms * 10)

      while (attempts < maxAttempts) {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Session is ready, now we can accept the invitation
          const { error } = await supabase
            .rpc('accept_dealer_invitation', {
              token_input: invitation
            });

          if (error) {
            toast({
              title: t('auth.signup.invitation_accept_error'),
              description: error.message,
              variant: "destructive",
            });
          } else {
            toast({
              title: t('auth.signup.success_title'),
              description: t('auth.signup.invitation_accepted'),
              variant: "default",
            });
          }
          return; // Success - exit function
        }

        // Wait 500ms before next attempt
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      // If we got here, session never became available - email confirmation is required
      // Show informative message instead of error
      toast({
        title: t('auth.signup.success_title'),
        description: t('auth.signup.email_confirmation_pending_with_invitation'),
        variant: "default",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth.unexpected_error');
      toast({
        title: t('auth.signup.invitation_accept_error'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      {/* Skip Link for Keyboard Navigation */}
      <a
        href="#auth-form"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {t('auth.skip_to_form', 'Skip to sign in form')}
      </a>

      {/* Top right controls */}
      <header className="fixed top-4 right-4 flex items-center gap-2 z-10">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      {/* Centered Login Form */}
      <main className="w-full max-w-md animate-fade-in">
        {/* Logo and Brand Section */}
        <div className="text-center mb-8">
          {/* Custom Logo (if configured by system_admin) */}
          {branding.logo_url && branding.enabled && (
            <div className="flex justify-center mb-4">
              <img
                src={branding.logo_url}
                alt={branding.title}
                className="h-16 w-auto object-contain max-w-full"
                onError={(e) => {
                  // Hide broken image if load fails
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Title (customizable by system_admin) */}
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
            {branding.enabled && branding.title ? branding.title : t('auth.app_title', 'My Detail Area')}
          </h1>

          {/* Tagline (customizable by system_admin) */}
          <p className="text-muted-foreground text-lg">
            {branding.enabled && branding.tagline ? branding.tagline : t('auth.app_subtitle', 'Dealership Operations Platform')}
          </p>
        </div>

        <Card className="border-2 border-border/20 dark:border-border/40 bg-card dark:bg-muted/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-foreground mb-2">
              {isSignupMode ? t('auth.signup.welcome_title', 'Create Your Account') : t('auth.welcome_title', 'Welcome back')}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {isSignupMode ? t('auth.signup.welcome_subtitle', 'Join the dealership') : t('auth.welcome_subtitle', 'Sign in to your account')}
            </CardDescription>

            {/* Invitation Info */}
            {isSignupMode && invitationData && (
              <div className="mt-4 p-3 bg-indigo-500/10 dark:bg-indigo-500/10 rounded-lg border border-indigo-500/30 dark:border-indigo-500/30" role="status">
                <p className="text-sm text-indigo-500 dark:text-indigo-500">
                  {t('auth.signup.invitation_info', 'You\'ve been invited to join')} <strong>{invitationData.dealership.name}</strong> {t('auth.signup.as_role', 'as')} <strong>{formatRoleName(invitationData.role_name)}</strong>
                </p>
              </div>
            )}

            {/* Invitation Error */}
            {isSignupMode && invitationError && (
              <div className="mt-4 p-3 bg-red-500/10 dark:bg-red-500/10 rounded-lg border border-red-500/30 dark:border-red-500/30" role="alert" aria-live="assertive">
                <p className="text-sm text-red-500 dark:text-red-500">
                  {invitationError}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {/* Loading State */}
            {invitationLoading && isSignupMode && (
              <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" aria-hidden="true" />
                  <span className="text-muted-foreground">{t('auth.signup.verifying_invitation', 'Verifying invitation...')}</span>
                </div>
              </div>
            )}

            {/* Show form only if not loading invitation or if in signin mode */}
            {(!invitationLoading && (!isSignupMode || (isSignupMode && invitationData))) && (
              <form id="auth-form" onSubmit={isSignupMode ? handleSignUp : handleSignIn} className="space-y-6">
                {/* First Name - Only for signup */}
                {isSignupMode && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-semibold text-foreground dark:text-foreground">
                        {t('auth.signup.first_name', 'First Name')}
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(sanitizeInput(e.target.value))}
                        maxLength={50}
                        required
                        aria-required="true"
                        className="h-11 bg-background dark:bg-muted/10 border-border dark:border-border/60 focus:border-accent dark:focus:border-accent text-foreground transition-colors"
                        placeholder={t('auth.signup.first_name_placeholder', 'Enter first name')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-semibold text-foreground dark:text-foreground">
                        {t('auth.signup.last_name', 'Last Name')}
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(sanitizeInput(e.target.value))}
                        maxLength={50}
                        required
                        aria-required="true"
                        className="h-11 bg-background dark:bg-muted/10 border-border dark:border-border/60 focus:border-accent dark:focus:border-accent text-foreground transition-colors"
                        placeholder={t('auth.signup.last_name_placeholder', 'Enter last name')}
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground dark:text-foreground">
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
                    disabled={isSignupMode && invitationData} // Disable if signup with invitation
                    className="h-11 bg-background dark:bg-muted/10 border-border dark:border-border/60 focus:border-accent dark:focus:border-accent text-foreground transition-colors disabled:opacity-50"
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

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground dark:text-foreground">
                    {t('auth.password_label', 'Password')}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isSignupMode ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-required="true"
                    className="h-11 bg-background dark:bg-muted/10 border-border dark:border-border/60 focus:border-accent dark:focus:border-accent text-foreground transition-colors"
                    placeholder={isSignupMode ? t('auth.signup.password_placeholder', 'Create a strong password') : t('auth.password_placeholder', 'Enter your password')}
                  />
                  {/* Forgot password link - only in sign-in mode */}
                  {!isSignupMode && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        className="text-xs text-primary hover:underline"
                      >
                        {t('auth.forgot_password_link', 'Forgot password?')}
                      </button>
                    </div>
                  )}
                  {/* Password strength indicator for signup */}
                  {isSignupMode && password && (
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

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-11 bg-primary dark:bg-accent hover:bg-primary/90 dark:hover:bg-accent/90 text-primary-foreground dark:text-accent-foreground font-medium text-base shadow-lg"
                  disabled={loading || (isSignupMode && !invitationData)}
                  aria-busy={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                      {isSignupMode ? t('auth.signup.creating_account', 'Creating account...') : t('auth.signing_in', 'Signing in...')}
                    </div>
                  ) : (
                    isSignupMode ? t('auth.signup.create_account_button', 'Create Account') : t('auth.sign_in_button', 'Sign In')
                  )}
                </Button>

                {/* Mode Switch */}
                {isSignupMode && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      {t('auth.signup.already_have_account', 'Already have an account?')}{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/auth?mode=signin')}
                        className="text-primary hover:underline font-medium"
                      >
                        {t('auth.signup.sign_in_instead', 'Sign in instead')}
                      </button>
                    </p>
                  </div>
                )}
              </form>
            )}

            {/* Error State for Invalid Invitation */}
            {isSignupMode && !invitationLoading && invitationError && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {t('auth.signup.invitation_invalid', 'This invitation is invalid or has expired.')}
                </p>
                <Button
                  onClick={() => navigate('/auth')}
                  variant="outline"
                >
                  {t('auth.signup.go_to_signin', 'Go to Sign In')}
                </Button>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('auth.no_access_text', "Don't have access? Contact your dealer administrator.")}
              </p>
            </div>
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
