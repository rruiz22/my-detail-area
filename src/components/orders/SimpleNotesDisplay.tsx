import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SimpleNotesDisplayProps {
  order: any;
}

export function SimpleNotesDisplay({ order }: SimpleNotesDisplayProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          {t('order_detail.simple_notes')}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="p-4 bg-muted/20 rounded-lg border border-dashed min-h-[120px]">
          {order.notes ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {order.notes}
            </p>
          ) : (
            <div className="flex items-center justify-center h-[80px]">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground italic">
                  {t('order_detail.no_notes_provided')}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Notes metadata */}
        {order.notes && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {order.notes.split(' ').length} {t('qr_block.words_in_general').split(' ')[0]} • {order.notes.length} characters
              </span>
              <span>
                Added {order.created_at ? new Date(order.created_at).toLocaleDateString() : t('common.recently')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}