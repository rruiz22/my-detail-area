import { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Invitation and signup states
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);

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
        throw new Error(data?.message || 'Invalid invitation token');
      }

      setInvitationData(data.invitation);
      setEmail(data.invitation.email); // Set email from invitation
      setInvitationError(null);
    } catch (error: any) {
      setInvitationError(error.message);
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
    } catch (error: any) {
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
    } catch (error: any) {
      toast({
        title: t('auth.signup.invitation_accept_error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      {/* Top right controls */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      {/* Centered Login Form */}
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
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t('auth.signup.invitation_info', 'You\'ve been invited to join')} <strong>{invitationData.dealership.name}</strong> {t('auth.signup.as_role', 'as')} <strong>{invitationData.role_name}</strong>
                </p>
              </div>
            )}

            {/* Invitation Error */}
            {isSignupMode && invitationError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {invitationError}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {/* Loading State */}
            {invitationLoading && isSignupMode && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-muted-foreground">{t('auth.signup.verifying_invitation', 'Verifying invitation...')}</span>
                </div>
              </div>
            )}

            {/* Show form only if not loading invitation or if in signin mode */}
            {(!invitationLoading && (!isSignupMode || (isSignupMode && invitationData))) && (
              <form onSubmit={isSignupMode ? handleSignUp : handleSignIn} className="space-y-6">
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
                        value={firstName}
                        onChange={(e) => setFirstName(sanitizeInput(e.target.value))}
                        maxLength={50}
                        required
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
                        value={lastName}
                        onChange={(e) => setLastName(sanitizeInput(e.target.value))}
                        maxLength={50}
                        required
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
                    value={email}
                    onChange={(e) => setEmail(sanitizeInput(e.target.value))}
                    maxLength={100}
                    required
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 bg-background dark:bg-muted/10 border-border dark:border-border/60 focus:border-accent dark:focus:border-accent text-foreground transition-colors"
                    placeholder={isSignupMode ? t('auth.signup.password_placeholder', 'Create a strong password') : t('auth.password_placeholder', 'Enter your password')}
                  />
                  {/* Password strength indicator for signup */}
                  {isSignupMode && password && (
                    <div className="space-y-1">
                      {(() => {
                        const validation = validatePassword(password);
                        return (
                          <div className="text-xs space-y-1">
                            <div className={`flex items-center gap-2 ${validation.checks.length ? 'text-green-600' : 'text-red-600'}`}>
                              <div className="w-2 h-2 rounded-full bg-current" />
                              {t('auth.signup.password_length', 'At least 8 characters')}
                            </div>
                            <div className={`flex items-center gap-2 ${validation.checks.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                              <div className="w-2 h-2 rounded-full bg-current" />
                              {t('auth.signup.password_uppercase', 'One uppercase letter')}
                            </div>
                            <div className={`flex items-center gap-2 ${validation.checks.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                              <div className="w-2 h-2 rounded-full bg-current" />
                              {t('auth.signup.password_lowercase', 'One lowercase letter')}
                            </div>
                            <div className={`flex items-center gap-2 ${validation.checks.number ? 'text-green-600' : 'text-red-600'}`}>
                              <div className="w-2 h-2 rounded-full bg-current" />
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
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                        onClick={() => {
                          const newUrl = new URL(window.location.href);
                          newUrl.searchParams.set('mode', 'signin');
                          window.location.href = newUrl.toString();
                        }}
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
                  onClick={() => {
                    window.location.href = '/auth';
                  }}
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
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>{t('auth.footer_text', '© 2024 My Detail Area. Dealership operations platform.')}</p>
        </div>
      </div>
    </div>
  );
}