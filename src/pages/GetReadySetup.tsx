import React, { useState } from 'react';
import { GetReadyContent } from '@/components/get-ready/GetReadyContent';
import { StepsList } from '@/components/get-ready/StepsList';
import { WorkItemTemplatesManager } from '@/components/get-ready/WorkItemTemplatesManager';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListOrdered, FileCheck } from 'lucide-react';

export function GetReadySetup() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('steps');

  // Only system_admin, dealer_admin, and dealer_manager can access
  const canAccess = user?.role === 'system_admin' ||
                    user?.role === 'dealer_admin' ||
                    user?.role === 'dealer_manager';

  if (!canAccess) {
    return (
      <GetReadyContent>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {t('get_ready.setup.access_denied')}
            </h2>
            <p className="text-sm text-gray-500">
              Administrators and managers only
            </p>
          </div>
        </div>
      </GetReadyContent>
    );
  }

  return (
    <GetReadyContent>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            {t('get_ready.setup.title')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {t('get_ready.setup.subtitle')}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="steps" className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4" />
              <span>{t('get_ready.setup.workflow_steps')}</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              <span>{t('get_ready.setup.work_item_templates')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="steps">
            <StepsList />
          </TabsContent>

          <TabsContent value="templates">
            <WorkItemTemplatesManager />
          </TabsContent>
        </Tabs>
      </div>
    </GetReadyContent>
  );
}