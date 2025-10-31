import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAppVersion } from '@/hooks/useAppVersion';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Componente que muestra un banner cuando hay una nueva versión disponible
 * Debe colocarse en el layout principal de la aplicación
 */
export function UpdateBanner() {
  const { newVersionAvailable, reloadApp, currentVersion } = useAppVersion();

  if (!newVersionAvailable) return null;

  return (
    <Alert className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto border-primary bg-primary/10">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Nueva versión disponible</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm">
          Versión {currentVersion?.version} disponible. Recarga para actualizar.
        </span>
        <Button
          onClick={reloadApp}
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </AlertDescription>
    </Alert>
  );
}
