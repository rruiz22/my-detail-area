import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Bell, Mail, MessageSquare, Smartphone, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export interface NotificationEvent {
  id: string;
  label: string;
  category: 'orders' | 'team' | 'deadlines' | 'financial' | 'system';
  description: string;
  hasConfig: boolean;
}

interface NotificationEventsTableProps {
  events: NotificationEvent[];
  preferences: Record<string, Record<NotificationChannel, boolean>>;
  onToggle: (eventId: string, channel: NotificationChannel, value: boolean) => void;
  onConfigure?: (eventId: string) => void;
}

export function NotificationEventsTable({
  events,
  preferences,
  onToggle,
  onConfigure,
}: NotificationEventsTableProps) {
  const { t } = useTranslation();

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'in_app': return <Bell className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'push': return <Smartphone className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'orders': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'team': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'deadlines': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'financial': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'system': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[280px]">{t('notifications.event')}</TableHead>
            <TableHead className="w-[120px]">{t('notifications.category')}</TableHead>
            <TableHead className="text-center w-[100px]">
              <div className="flex flex-col items-center gap-1">
                {getChannelIcon('in_app')}
                <span className="text-xs font-normal">{t('notifications.in_app')}</span>
              </div>
            </TableHead>
            <TableHead className="text-center w-[100px]">
              <div className="flex flex-col items-center gap-1">
                {getChannelIcon('email')}
                <span className="text-xs font-normal">{t('notifications.email')}</span>
              </div>
            </TableHead>
            <TableHead className="text-center w-[100px]">
              <div className="flex flex-col items-center gap-1">
                {getChannelIcon('sms')}
                <span className="text-xs font-normal">{t('notifications.sms')}</span>
              </div>
            </TableHead>
            <TableHead className="text-center w-[100px]">
              <div className="flex flex-col items-center gap-1">
                {getChannelIcon('push')}
                <span className="text-xs font-normal">{t('notifications.push')}</span>
              </div>
            </TableHead>
            <TableHead className="text-center w-[80px]">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                {t('notifications.no_events')}
              </TableCell>
            </TableRow>
          ) : (
            events.map((event) => (
              <TableRow key={event.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{event.label}</p>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`capitalize text-xs ${getCategoryColor(event.category)}`}>
                    {t(`notifications.categories.${event.category}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={preferences[event.id]?.in_app || false}
                      onCheckedChange={(checked) =>
                        onToggle(event.id, 'in_app', checked as boolean)
                      }
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={preferences[event.id]?.email || false}
                      onCheckedChange={(checked) =>
                        onToggle(event.id, 'email', checked as boolean)
                      }
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={preferences[event.id]?.sms || false}
                      onCheckedChange={(checked) =>
                        onToggle(event.id, 'sms', checked as boolean)
                      }
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={preferences[event.id]?.push || false}
                      onCheckedChange={(checked) =>
                        onToggle(event.id, 'push', checked as boolean)
                      }
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {event.hasConfig && onConfigure && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onConfigure(event.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
