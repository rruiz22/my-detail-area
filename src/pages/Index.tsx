import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LandingHeader } from '@/components/LandingHeader';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ShoppingCart, 
  Wrench, 
  RefreshCw, 
  Car, 
  MessageCircle, 
  BarChart3, 
  Shield, 
  Zap,
  CheckCircle2,
  Users2,
  Clock,
  TrendingUp,
  Star,
  ArrowRight
} from 'lucide-react';

const Index = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const features = [
    {
      icon: ShoppingCart,
      title: t('landing.features.sales.title'),
      description: t('landing.features.sales.description'),
      color: 'text-blue-600'
    },
    {
      icon: Wrench,
      title: t('landing.features.service.title'),
      description: t('landing.features.service.description'),
      color: 'text-green-600'
    },
    {
      icon: RefreshCw,
      title: t('landing.features.recon.title'),
      description: t('landing.features.recon.description'),
      color: 'text-orange-600'
    },
    {
      icon: Car,
      title: t('landing.features.carwash.title'),
      description: t('landing.features.carwash.description'),
      color: 'text-purple-600'
    },
    {
      icon: MessageCircle,
      title: t('landing.features.communication.title'),
      description: t('landing.features.communication.description'),
      color: 'text-indigo-600'
    },
    {
      icon: BarChart3,
      title: t('landing.features.analytics.title'),
      description: t('landing.features.analytics.description'),
      color: 'text-teal-600'
    }
  ];

  const benefits = [
    {
      icon: Clock,
      title: t('landing.benefits.efficiency.title'),
      description: t('landing.benefits.efficiency.description')
    },
    {
      icon: Users2,
      title: t('landing.benefits.collaboration.title'),
      description: t('landing.benefits.collaboration.description')
    },
    {
      icon: TrendingUp,
      title: t('landing.benefits.performance.title'),
      description: t('landing.benefits.performance.description')
    },
    {
      icon: Shield,
      title: t('landing.benefits.security.title'),
      description: t('landing.benefits.security.description')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <div className="mx-auto max-w-4xl space-y-8">
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
              {t('landing.hero.badge')}
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="block text-foreground">{t('landing.hero.title_part1')}</span>
              <span className="block bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                {t('landing.hero.title_part2')}
              </span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              {t('landing.hero.description')}
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {user ? (
                <Button asChild size="lg" className="px-8 py-6 text-lg">
                  <Link to="/dashboard" className="gap-2">
                    <Zap className="h-5 w-5" />
                    {t('landing.hero.go_to_dashboard')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="px-8 py-6 text-lg">
                    <Link to="/auth" className="gap-2">
                      {t('landing.hero.get_started')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="px-8 py-6 text-lg">
                    <Link to="/auth">
                      {t('landing.hero.learn_more')}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Decorative gradient */}
        <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-accent opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('landing.features.title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('landing.features.description')}
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0" 
                    style={{ boxShadow: 'var(--shadow-card)' }}>
                <CardHeader>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-primary/10 to-primary-glow/10 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('landing.benefits.title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('landing.benefits.description')}
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center group">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-glow group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{benefit.title}</h3>
                <p className="mt-2 text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t('landing.cta.title')}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t('landing.cta.description')}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="px-8 py-6 text-lg">
                  <Link to="/auth" className="gap-2">
                    {t('landing.cta.get_started')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t bg-muted/50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary-glow">
                <span className="text-sm font-bold text-primary-foreground">MDA</span>
              </div>
              <span className="font-bold text-foreground">{t('landing.app_name')}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 {t('landing.app_name')}. {t('landing.footer.rights')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
