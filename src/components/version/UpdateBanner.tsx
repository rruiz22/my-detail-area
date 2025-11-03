import { Button } from '@/components/ui/button';
import { useAppVersion } from '@/hooks/useAppVersion';
import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Componente que muestra un banner cuando hay una nueva versión disponible
 * Debe colocarse en el layout principal de la aplicación
 */
export function UpdateBanner() {
  // ✅ TODOS los hooks DEBEN estar al inicio, antes de cualquier return
  const { t } = useTranslation();
  const [isDismissed, setIsDismissed] = useState(false);
  const { newVersionAvailable, reloadApp, latestVersion } = useAppVersion();

  // ✅ Ahora sí podemos hacer el early return
  if (!newVersionAvailable || isDismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2">
      <div className="bg-gray-900 text-white border border-gray-700 rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 w-auto">
        <p className="text-sm whitespace-nowrap">
          <span className="font-medium">{t('system_update.title')}</span>
          <span className="text-gray-400 ml-2">
            {t('system_update.message', { version: latestVersion?.version || 'nueva' })}
          </span>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={reloadApp}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            {t('system_update.button')}
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
