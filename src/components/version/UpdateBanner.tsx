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
    <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 animate-in slide-in-from-bottom-2">
      <div className="bg-gray-900 text-white border border-gray-700 rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 md:gap-3 w-full md:w-auto">
        {/* Texto - stack en móvil, inline en desktop */}
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm">
            <span className="font-medium block md:inline">{t('system_update.title')}</span>
            <span className="text-gray-400 block md:inline md:ml-2 truncate">
              {t('system_update.message', { version: latestVersion?.version || 'nueva' })}
            </span>
          </p>
        </div>

        {/* Botones compactos */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            onClick={reloadApp}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5 text-xs"
          >
            <RefreshCw className="h-3 w-3 md:mr-1.5" />
            <span className="hidden md:inline">{t('system_update.button')}</span>
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1 h-7 w-7 flex items-center justify-center"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
