import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';

const Index = () => {
  const { t } = useTranslation();
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div>
          <h1 className="mb-4 text-4xl font-bold">{t('landing.welcome')}</h1>
          <p className="text-xl text-muted-foreground">{t('landing.description')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link to="/auth" className="gap-2">
              <LogIn className="h-5 w-5" />
              {t('landing.sign_in')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/auth" className="gap-2">
              <UserPlus className="h-5 w-5" />
              {t('landing.register')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
