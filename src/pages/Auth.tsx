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
        title: "Invalid Email",
        description: "Please enter a valid email address.",
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
          errorMessage = "Invalid email or password. If you don't have an account, please contact your dealer for an invitation.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and click the confirmation link before signing in.";
        }
        
        toast({
          title: "Sign In Error",
          description: errorMessage,
          variant: "destructive",
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
              Welcome back
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground mb-6">
              Sign in to your account
            </CardDescription>
            
            <Alert className="text-left border-accent/20 bg-accent/5">
              <div className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <AlertDescription className="text-sm leading-relaxed">
                  <strong className="text-accent">Access by invitation only</strong><br/>
                  New users must be invited by a dealer administrator. Contact your dealer to request access to the system.
                </AlertDescription>
              </div>
            </Alert>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-enhanced h-11 border-border/50 focus:border-accent transition-colors"
                  placeholder="Enter your password"
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
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Need access? Contact your dealer administrator to request an invitation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>© 2024 My Detail Area. Invitation-only access for dealership operations.</p>
        </div>
      </div>
    </div>
  );
}