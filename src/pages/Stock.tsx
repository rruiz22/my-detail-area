import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StockDashboard } from '@/components/stock/StockDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePermissions } from '@/hooks/usePermissions';
import { AlertCircle, ArrowLeft, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// ✅ FIX BUG-02: Error fallback UI for Stock module
const StockErrorFallback = ({ reset }: { reset?: () => void }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center space-y-6">
          <Package className="h-20 w-20 mx-auto text-destructive" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{t('errors.stock_error', 'Stock Module Error')}</h2>
            <p className="text-muted-foreground">
              {t('errors.stock_error_description', 'An error occurred while loading the inventory module.')}
            </p>
            <ul className="list-disc list-inside text-left text-sm text-muted-foreground mx-auto max-w-xs">
              <li>{t('errors.try_refresh', 'Try refreshing the page')}</li>
              <li>{t('errors.clear_cache', 'Clear your browser cache')}</li>
              <li>{t('errors.contact_admin', 'Contact your administrator')}</li>
            </ul>
          </div>
          <div className="flex gap-2 justify-center">
            {reset && (
              <Button onClick={reset} variant="default">
                {t('common.try_again', 'Try Again')}
              </Button>
            )}
            <Link to="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back_to_dashboard', 'Back to Dashboard')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Stock = () => {
  const { t } = useTranslation();
  const { hasModulePermission } = usePermissions();

  // Check if user has permission to view stock module
  if (!hasModulePermission('stock', 'view_inventory')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
          <h2 className="text-2xl font-bold">{t('errors.no_permission')}</h2>
          <p className="text-muted-foreground max-w-md">
            {t('errors.no_module_access', { module: t('stock.title') })}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('errors.required_permission')}: <code className="bg-muted px-2 py-1 rounded">stock.view</code>
          </p>
        </div>
      </div>
    );
  }

  // ✅ FIX BUG-02: Wrap with ErrorBoundary for graceful error handling
  return (
    <ErrorBoundary fallback={(reset) => <StockErrorFallback reset={reset} />}>
      <StockDashboard />
    </ErrorBoundary>
  );
};

export default Stock;
