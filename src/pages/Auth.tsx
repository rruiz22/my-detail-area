import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Shield } from 'lucide-react';

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
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''));
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Redirect if already authenticated
  if (user) {
    const redirectTo = searchParams.get('redirect');
    // If redirect parameter exists and is a valid route, use it; otherwise default to /dashboard
    const destination = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordValidation(validatePassword(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs before submission
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedFirstName = sanitizeInput(firstName);
    const sanitizedLastName = sanitizeInput(lastName);
    
    if (!validateEmail(sanitizedEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    if (isSignUp && !passwordValidation.isValid) {
      toast({
        title: "Weak Password",
        description: "Password must meet security requirements.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = isSignUp 
        ? await signUp(sanitizedEmail, password, sanitizedFirstName, sanitizedLastName)
        : await signIn(sanitizedEmail, password);

      if (error) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (isSignUp) {
        toast({
          title: "Account Created",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Logo and Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-6 shadow-elegant">
            <div className="text-white text-2xl font-bold">M</div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
            My Detail Area
          </h1>
          <p className="text-muted-foreground text-lg">
            Dealership Operations Hub
          </p>
        </div>

        <Card className="card-enhanced border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold text-foreground mb-2">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {isSignUp 
                ? 'Get started with your new account' 
                : 'Sign in to your account'
              }
            </CardDescription>
            {isSignUp && (
              <Alert className="mt-6 text-left border-accent/20 bg-accent/5">
                <div className="flex items-start space-x-2">
                  <Shield className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                  <AlertDescription className="text-sm leading-relaxed">
                    <strong className="text-accent">Para pruebas de administrador:</strong><br/>
                    Use <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">admin@company.com</code> con cualquier contraseña para obtener permisos completos de administrador automáticamente.
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(sanitizeInput(e.target.value))}
                      maxLength={50}
                      required
                      className="input-enhanced h-11 border-border/50 focus:border-accent transition-colors"
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(sanitizeInput(e.target.value))}
                      maxLength={50}
                      required
                      className="input-enhanced h-11 border-border/50 focus:border-accent transition-colors"
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(sanitizeInput(e.target.value))}
                  maxLength={100}
                  required
                  className="input-enhanced h-11 border-border/50 focus:border-accent transition-colors"
                  placeholder="Enter your email address"
                />
                {email && !validateEmail(email) && (
                  <Alert variant="destructive" className="py-2">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Please enter a valid email address
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  required
                  minLength={8}
                  className="input-enhanced h-11 border-border/50 focus:border-accent transition-colors"
                  placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
                />
                {isSignUp && password && (
                  <div className="space-y-3 mt-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-foreground">Password Requirements</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className={`flex items-center gap-2 transition-colors ${passwordValidation.checks.length ? 'text-success' : 'text-muted-foreground'}`}>
                        {passwordValidation.checks.length ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        At least 8 characters
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${passwordValidation.checks.uppercase ? 'text-success' : 'text-muted-foreground'}`}>
                        {passwordValidation.checks.uppercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        One uppercase letter
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${passwordValidation.checks.lowercase ? 'text-success' : 'text-muted-foreground'}`}>
                        {passwordValidation.checks.lowercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        One lowercase letter
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${passwordValidation.checks.number ? 'text-success' : 'text-muted-foreground'}`}>
                        {passwordValidation.checks.number ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        One number
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${passwordValidation.checks.special ? 'text-success' : 'text-muted-foreground'}`}>
                        {passwordValidation.checks.special ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        One special character
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 button-enhanced bg-gradient-primary hover:bg-gradient-primary/90 text-primary-foreground font-medium text-base" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <Button
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-accent hover:text-accent/80 font-medium p-0 h-auto"
              >
                {isSignUp ? 'Sign in instead' : 'Create account'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>© 2024 My Detail Area. Secure dealership operations.</p>
        </div>
      </div>
    </div>
  );
}