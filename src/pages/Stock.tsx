import { StockDashboard } from '@/components/stock/StockDashboard';
import { usePermissions } from '@/hooks/usePermissions';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Stock = () => {
  const { t } = useTranslation();
  const { hasModulePermission } = usePermissions();

  // Check if user has permission to view stock module
  if (!hasModulePermission('stock', 'view')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
          <h2 className="text-2xl font-bold">{t('errors.no_permission')}</h2>
          <p className="text-muted-foreground max-w-md">
            {t('errors.no_module_access', { module: t('stock.title') })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StockDashboard />
    </div>
  );
};

export default Stock;
