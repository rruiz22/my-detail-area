import React, { useState, useEffect } from 'react';
import { StepsList } from '@/components/get-ready/StepsList';
import { WorkItemTemplatesManager } from '@/components/get-ready/WorkItemTemplatesManager';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListOrdered, FileCheck, TrendingUp } from 'lucide-react';
import { SLAConfigurationPanel } from '@/components/get-ready/SLAConfigurationPanel';
type SetupTab = 'steps' | 'templates' | 'sla';
export function GetReadySetup() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SetupTab>(() => {
    try {
      const stored = localStorage.getItem('get_ready_setup_activeTab');
      if (stored && ['steps', 'templates', 'sla'].includes(stored)) {
        return stored as SetupTab;
      }
    } catch (error) {
      console.warn('Failed to read tab from localStorage:', error);
    }
    return 'steps';
  });
  useEffect(() => {
    try {
      localStorage.setItem('get_ready_setup_activeTab', activeTab);
    } catch (error) {
      console.warn('Failed to save tab to localStorage:', error);
    }
  }, [activeTab]);
  return (
    <PermissionGuard
      module="get_ready"
      permission="access_setup"
      checkDealerModule={true}
    >
      <div className="space-y-6 w-full p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('get_ready.setup.title')}
          </h1>
          <p className="text-muted-foreground">
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
          <TabsContent value="steps" className="space-y-6">
            <StepsList />
          </TabsContent>
          <TabsContent value="templates" className="space-y-6">
            <WorkItemTemplatesManager />
          </TabsContent>
          <TabsContent value="sla" className="space-y-6">
            <SLAConfigurationPanel />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
