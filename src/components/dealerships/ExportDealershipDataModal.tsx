/**
 * Export Dealership Data Modal
 *
 * Modal for exporting dealership data in Excel or JSON format
 *
 * Features:
 * - Select export scope (users, orders, all)
 * - Select export format (Excel, JSON)
 * - Progress indicator during export
 * - Auto-download generated file
 *
 * @module components/dealerships/ExportDealershipDataModal
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, FileSpreadsheet, FileJson, Users, ShoppingCart, Package } from 'lucide-react';
import { useDealershipExport, ExportFormat, ExportScope } from '@/hooks/useDealershipExport';

interface ExportDealershipDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealership: {
    id: number;
    name: string;
  } | null;
}

export function ExportDealershipDataModal({
  isOpen,
  onClose,
  dealership
}: ExportDealershipDataModalProps) {
  const { t } = useTranslation();
  const { exportDealership, progress, isExporting } = useDealershipExport();

  const [selectedScope, setSelectedScope] = useState<ExportScope>('all');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');

  const handleExport = async () => {
    if (!dealership) return;

    await exportDealership({
      dealershipId: dealership.id,
      dealershipName: dealership.name,
      format: selectedFormat,
      scope: selectedScope
    });

    // Don't close modal immediately - let user see completion
    if (!isExporting) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onClose();
    }
  };

  if (!dealership) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            {t('dealerships.export_data')}
          </DialogTitle>
          <DialogDescription>
            {t('dealerships.export_data_description', { name: dealership.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Scope Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {t('dealerships.export_what_to_include')}
            </Label>
            <RadioGroup
              value={selectedScope}
              onValueChange={(value) => setSelectedScope(value as ExportScope)}
              disabled={isExporting}
            >
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="users" id="scope-users" />
                <Label htmlFor="scope-users" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">{t('dealerships.users_and_memberships')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('dealerships.export_users_description')}
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="orders" id="scope-orders" />
                <Label htmlFor="scope-orders" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{t('dealerships.all_orders')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('dealerships.export_orders_description')}
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="all" id="scope-all" />
                <Label htmlFor="scope-all" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">{t('dealerships.complete_package')}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {t('common.recommended')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('dealerships.export_all_description')}
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Export Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {t('dealerships.export_format')}
            </Label>
            <RadioGroup
              value={selectedFormat}
              onValueChange={(value) => setSelectedFormat(value as ExportFormat)}
              disabled={isExporting}
            >
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="excel" id="format-excel" />
                <Label htmlFor="format-excel" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Excel (.xlsx)</span>
                    <Badge variant="secondary" className="ml-auto">
                      {t('common.recommended')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('dealerships.export_excel_description')}
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="json" id="format-json" />
                <Label htmlFor="format-json" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">JSON</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('dealerships.export_json_description')}
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Progress Indicator */}
          {isExporting && (
            <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{progress.message}</span>
                <Badge variant="outline">{progress.percentage}%</Badge>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </div>
          )}

          {/* Success Message */}
          {progress.stage === 'complete' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              ✅ {t('dealerships.export_complete')}
            </div>
          )}

          {/* Error Message */}
          {progress.stage === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              ❌ {progress.message}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isExporting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || progress.stage === 'complete'}
          >
            {isExporting ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-pulse" />
                {t('dealerships.exporting')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('dealerships.export')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
