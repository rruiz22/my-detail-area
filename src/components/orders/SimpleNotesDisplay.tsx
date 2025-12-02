import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SimpleNotesDisplayProps {
  order: {
    notes?: string;
    created_at?: string;
    [key: string]: unknown;
  };
}

export function SimpleNotesDisplay({ order }: SimpleNotesDisplayProps) {
  const { t } = useTranslation();

  // Don't render if no notes
  if (!order.notes) {
    return null;
  }

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-3 bg-muted/30">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold">{t('order_detail.simple_notes')}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
              {order.notes}
            </p>
          </div>
        </div>

        {/* Notes metadata - compact */}
        <div className="mt-2 flex items-center justify-end text-xs text-muted-foreground">
          <span>
            {order.notes.split(' ').length} {t('order_detail.words')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
