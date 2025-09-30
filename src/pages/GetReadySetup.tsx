import { GetReadyContent } from '@/components/get-ready/GetReadyContent';
import { StepsList } from '@/components/get-ready/StepsList';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export function GetReadySetup() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Only system_admin can access
  if (user?.role !== 'system_admin') {
    return (
      <GetReadyContent>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {t('get_ready.setup.access_denied')}
            </h2>
            <p className="text-sm text-gray-500">
              System administrators only
            </p>
          </div>
        </div>
      </GetReadyContent>
    );
  }

  return (
    <GetReadyContent>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            {t('get_ready.setup.title')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {t('get_ready.setup.subtitle')}
          </p>
        </div>

        {/* Steps List */}
        <StepsList />
      </div>
    </GetReadyContent>
  );
}