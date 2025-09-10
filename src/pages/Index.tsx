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

  const stats = [
    { 
      label: t('landing.stats.orders_processed'), 
      value: t('landing.stats.orders_processed_value'), 
      icon: ShoppingCart 
    },
    { 
      label: t('landing.stats.avg_time'), 
      value: t('landing.stats.avg_time_value'), 
      icon: TrendingUp 
    },
    { 
      label: t('landing.stats.customer_satisfaction'), 
      value: t('landing.stats.customer_satisfaction_value'), 
      icon: Star 
    },
    { 
      label: t('landing.stats.team_efficiency'), 
      value: t('landing.stats.team_efficiency_value'), 
      icon: Users2 
    },
  ];

  const testimonials = [
    {
      name: t('landing.testimonials.testimonial1.name'),
      role: t('landing.testimonials.testimonial1.role'),
      company: t('landing.testimonials.testimonial1.company'),
      content: t('landing.testimonials.testimonial1.content'),
    },
    {
      name: t('landing.testimonials.testimonial2.name'),
      role: t('landing.testimonials.testimonial2.role'),
      company: t('landing.testimonials.testimonial2.company'),
      content: t('landing.testimonials.testimonial2.content'),
    },
    {
      name: t('landing.testimonials.testimonial3.name'),
      role: t('landing.testimonials.testimonial3.role'),
      company: t('landing.testimonials.testimonial3.company'),
      content: t('landing.testimonials.testimonial3.content'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6">
            {t('landing.hero.badge')}
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 text-balance">
            <span className="block text-foreground">{t('landing.hero.title_part1')}</span>
            <span className="block bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              {t('landing.hero.title_part2')}
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto text-pretty">
            {t('landing.hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {user ? (
              <Button asChild size="lg" className="text-lg px-8">
                <Link to="/dashboard" className="gap-2">
                  <Zap className="h-5 w-5" />
                  {t('landing.hero.go_to_dashboard')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="text-lg px-8">
                  <Link to="/auth" className="gap-2">
                    {t('landing.hero.get_started')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 bg-transparent">
                  <Link to="/auth">
                    {t('landing.hero.learn_more')}
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center border-border/50">
                <CardContent className="pt-6">
                  <stat.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Decorative gradient */}
        <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-accent opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">{t('landing.features.title')}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.features.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20"
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-primary/10 ${feature.color}`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">{t('landing.benefits.title')}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.benefits.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card
                key={index}
                className="text-center group hover:shadow-lg transition-all duration-300 border-border/50"
              >
                <CardContent className="pt-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center">
                    <benefit.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">{t('landing.testimonials.title')}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.testimonials.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 leading-relaxed">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    <div className="text-sm text-primary">{testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-primary-glow">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            {t('landing.cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg px-8">
              <Link to="/auth" className="gap-2">
                {t('landing.cta.get_started')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
            >
              {t('landing.cta.schedule_demo')}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                  MDA
                </div>
                <span className="font-bold text-foreground">{t('landing.app_name')}</span>
              </div>
              <p className="text-muted-foreground text-sm">{t('landing.footer.tagline')}</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t('landing.footer.product')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground transition-colors">
                    {t('landing.navigation.features')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {t('landing.footer.pricing')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {t('landing.footer.integrations')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {t('landing.footer.api')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t('landing.footer.company')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {t('landing.footer.about')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {t('landing.footer.blog')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {t('landing.footer.careers')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {t('landing.footer.contact')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t('landing.footer.support')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {t('landing.footer.help_center')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {t('landing.footer.documentation')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {t('landing.footer.status')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    {t('landing.footer.privacy')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2024 {t('landing.app_name')}. {t('landing.footer.rights')}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;