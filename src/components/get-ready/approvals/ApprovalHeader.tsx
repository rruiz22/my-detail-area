import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useApprovalFilters } from '@/hooks/useApprovalFilters';
import { subDays } from 'date-fns';
import { Calendar, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ApprovalHeader() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { dateRange, setDateRange } = useApprovalFilters();

  const handlePresetChange = (preset: '7d' | '30d' | '90d') => {
    const to = new Date();
    const from = subDays(to, preset === '7d' ? 7 : preset === '30d' ? 30 : 90);

    setDateRange({
      from,
      to,
      preset
    });
  };

  const handleExport = () => {
    toast({
      title: 'Coming Soon',
      description: 'Export functionality will be available soon',
      variant: 'default'
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t('get_ready.approvals.title') || 'Enterprise Approvals'}
        </h2>
        <p className="text-muted-foreground">
          {t('get_ready.approvals.dashboard_subtitle') || 'Comprehensive approval tracking and analytics'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange.preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export Button */}
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
}
