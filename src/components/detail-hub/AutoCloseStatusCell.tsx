/**
 * Auto-Close Status Cell Component
 *
 * Displays auto-close status for an employee in the employee list table.
 * Shows: No issues | Pending review count | Recent auto-closes
 */

import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';

interface AutoCloseEntry {
  id: string;
  employee_id: string;
  auto_closed_at: string;
  auto_close_reason: string;
  requires_supervisor_review: boolean;
}

interface AutoCloseStatusCellProps {
  employeeId: string;
  autoCloseEntries: AutoCloseEntry[];
  onReviewClick?: (employeeId: string) => void;
}

export function AutoCloseStatusCell({
  employeeId,
  autoCloseEntries,
  onReviewClick
}: AutoCloseStatusCellProps) {
  const { t, i18n } = useTranslation();

  // Get date-fns locale based on current language
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'es':
        return es;
      case 'pt-BR':
        return ptBR;
      default:
        return undefined; // English is default
    }
  };

  // No entries at all
  if (!autoCloseEntries || autoCloseEntries.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-gray-500">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        <span className="text-xs">{t('detail_hub.no_auto_close_issues')}</span>
      </div>
    );
  }

  // Count entries requiring supervisor review
  const pendingReviewCount = autoCloseEntries.filter(
    (entry) => entry.requires_supervisor_review
  ).length;

  // Get most recent auto-close
  const mostRecent = autoCloseEntries.reduce((latest, entry) => {
    const entryDate = new Date(entry.auto_closed_at);
    const latestDate = new Date(latest.auto_closed_at);
    return entryDate > latestDate ? entry : latest;
  }, autoCloseEntries[0]);

  const timeAgo = mostRecent ? formatDistanceToNow(new Date(mostRecent.auto_closed_at), {
    addSuffix: true,
    locale: getDateLocale()
  }) : '';

  // Case 1: Has pending reviews
  if (pendingReviewCount > 0) {
    return (
      <button
        onClick={() => onReviewClick?.(employeeId)}
        className="flex items-center gap-1.5 hover:bg-amber-50 px-2 py-1 rounded transition-colors group"
        title={t('detail_hub.click_to_review')}
      >
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 cursor-pointer">
          <AlertCircle className="h-3 w-3 mr-1" />
          {t('detail_hub.pending_supervisor_review', { count: pendingReviewCount })}
        </Badge>
      </button>
    );
  }

  // Case 2: Has recent auto-closes (reviewed or not requiring review)
  return (
    <div className="flex items-center gap-1.5 text-gray-600">
      <Clock className="h-3.5 w-3.5 text-gray-400" />
      <span className="text-xs">
        {t('detail_hub.auto_closed_recently', { timeAgo })}
      </span>
    </div>
  );
}
