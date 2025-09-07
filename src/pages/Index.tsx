import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div>
          <h1 className="mb-4 text-4xl font-bold">Bienvenido al Sistema de Gestión</h1>
          <p className="text-xl text-muted-foreground">Inicia sesión para acceder a dealers, contactos y más funciones</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link to="/auth" className="gap-2">
              <LogIn className="h-5 w-5" />
              Iniciar Sesión
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/auth" className="gap-2">
              <UserPlus className="h-5 w-5" />
              Registrarse
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
