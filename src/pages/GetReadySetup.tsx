import React, { useState } from 'react';
import { GetReadyContent } from '@/components/get-ready/GetReadyContent';
import { StepsList } from '@/components/get-ready/StepsList';
import { WorkItemTemplatesManager } from '@/components/get-ready/WorkItemTemplatesManager';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListOrdered, FileCheck, TrendingUp } from 'lucide-react';
import { SLAConfigurationPanel } from '@/components/get-ready/SLAConfigurationPanel';

export function GetReadySetup() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('steps');

  return (
    <PermissionGuard
      module="get_ready"
      permission="access_setup"
      checkDealerModule={true}
    >
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
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="steps" className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4" />
              <span>{t('get_ready.setup.workflow_steps')}</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              <span>{t('get_ready.setup.work_item_templates')}</span>
            </TabsTrigger>
            <TabsTrigger value="sla" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>{t('get_ready.setup.sla_configuration')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="steps">
            <StepsList />
          </TabsContent>

          <TabsContent value="templates">
            <WorkItemTemplatesManager />
          </TabsContent>

          <TabsContent value="sla">
            <SLAConfigurationPanel />
          </TabsContent>
        </Tabs>
      </div>
      </GetReadyContent>
    </PermissionGuard>
  );
}