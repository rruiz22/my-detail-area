import { useState } from 'react';
import { Navigate } from 'react-router-dom';
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

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-primary mb-2">My Detail Area</h1>
            <p className="text-muted-foreground text-sm">Dealership Operations Hub</p>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Enter your details to create a new account' 
              : 'Enter your credentials to access your account'
            }
          </CardDescription>
          {isSignUp && (
            <Alert className="mt-4 text-left">
              <AlertDescription>
                <strong>Para pruebas de administrador:</strong><br/>
                Use: <code>admin@company.com</code> con cualquier contraseña para obtener permisos completos de administrador automáticamente.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(sanitizeInput(e.target.value))}
                    maxLength={50}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(sanitizeInput(e.target.value))}
                    maxLength={50}
                    required
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(sanitizeInput(e.target.value))}
                maxLength={100}
                required
              />
              {email && !validateEmail(email) && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>Please enter a valid email address</AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                minLength={8}
              />
              {isSignUp && password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">Password Strength</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.length ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.checks.length ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.checks.uppercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      One uppercase letter
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.checks.lowercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      One lowercase letter
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.number ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.checks.number ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      One number
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.special ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.checks.special ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      One special character
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}