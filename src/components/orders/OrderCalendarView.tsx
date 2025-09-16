import { useState, useMemo } from "react";
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  DollarSign,
  Car,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const localizer = momentLocalizer(moment);

interface OrderCalendarViewProps {
  orders: any[];
  loading?: boolean;
  onEdit: (order: any) => void;
  onView: (order: any) => void;
  onDelete: (orderId: string) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onCreateOrder?: (selectedDate: Date) => void;
}

export const OrderCalendarView = ({
  orders,
  loading = false,
  onEdit,
  onView,
  onDelete,
  onStatusChange,
  onCreateOrder
}: OrderCalendarViewProps) => {
  const { t } = useTranslation();
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [calendarView, setCalendarView] = useState<View>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Transform orders for react-big-calendar
  const calendarEvents = useMemo(() => {
    return orders
      .filter(order => order.due_date || order.scheduled_date || order.created_at) // Show orders with any available date
      .map(order => {
        // Use fallback logic: due_date → scheduled_date → created_at
        const displayDate = order.due_date || order.scheduled_date || order.created_at;
        const eventDate = parseISO(displayDate);
        const endDate = new Date(eventDate.getTime() + (2 * 60 * 60 * 1000)); // 2 hours duration

        // Determine the date source for title indication
        let dateSource = '';
        if (order.due_date) {
          dateSource = 'DUE';
        } else if (order.scheduled_date) {
          dateSource = 'SCH';
        } else {
          dateSource = 'CRE';
        }

        return {
          id: order.id,
          title: `[${dateSource}] ${order.id} - ${order.year} ${order.make} ${order.model}`.substring(0, 45),
          start: eventDate,
          end: endDate,
          allDay: false,
          resource: order,
          dateSource: dateSource.toLowerCase(),
        };
      });
  }, [orders]);

  const handleSelectSlot = ({ start }: { start: Date; end: Date }) => {
    if (onCreateOrder) {
      onCreateOrder(start);
    } else {
      toast.info(t('calendar.clickToCreateOrder'));
    }
  };

  const handleSelectEvent = (event: any) => {
    setSelectedOrder(event.resource);
  };

  const eventStyleGetter = (event: any) => {
    const order = event.resource;
    let backgroundColor = '#6B7280'; // default gray
    let borderColor = '#6B7280';
    let textColor = 'white';

    // Color coding by status
    switch (order.status?.toLowerCase()) {
      case 'pending':
        backgroundColor = '#EAB308'; // yellow
        borderColor = '#CA8A04';
        textColor = 'white';
        break;
      case 'in progress':
      case 'in_progress':
        backgroundColor = '#3B82F6'; // blue
        borderColor = '#2563EB';
        textColor = 'white';
        break;
      case 'completed':
        backgroundColor = '#10B981'; // green
        borderColor = '#059669';
        textColor = 'white';
        break;
      case 'cancelled':
        backgroundColor = '#EF4444'; // red
        borderColor = '#DC2626';
        textColor = 'white';
        break;
      default:
        backgroundColor = '#6B7280';
        borderColor = '#4B5563';
        textColor = 'white';
    }

    // Add visual indicators for date source type
    if (event.dateSource === 'sch') {
      // Scheduled dates get dashed border
      borderColor = borderColor;
    } else if (event.dateSource === 'cre') {
      // Created dates get dotted border and slightly muted background
      backgroundColor = backgroundColor + 'CC'; // Add transparency
    }

    // Add priority indicators
    if (order.priority === 'high') {
      borderColor = '#DC2626';
    } else if (order.priority === 'urgent') {
      borderColor = '#B91C1C';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: event.dateSource === 'due' ? 0.9 : 0.7, // Less opacity for fallback dates
        color: textColor,
        border: event.dateSource === 'sch' ? `2px dashed ${borderColor}` :
                event.dateSource === 'cre' ? `2px dotted ${borderColor}` :
                `2px solid ${borderColor}`,
        display: 'block',
        fontSize: '12px',
        fontWeight: '500'
      }
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'in progress':
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'in progress':
      case 'in_process':
        return 'default';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-96 bg-muted rounded flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {format(selectedDate, 'MMMM yyyy')}
          </h3>
          <Badge variant="outline" className="text-sm">
            {calendarEvents.length} {t('common.orders')}
          </Badge>
        </div>

        {/* View Controls - Mobile Responsive */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={calendarView === 'month' ? 'default' : 'outline'}
            onClick={() => setCalendarView('month')}
            className="text-xs sm:text-sm"
          >
            {t('calendar.month')}
          </Button>
          <Button
            size="sm"
            variant={calendarView === 'week' ? 'default' : 'outline'}
            onClick={() => setCalendarView('week')}
            className="text-xs sm:text-sm"
          >
            {t('calendar.week')}
          </Button>
          <Button
            size="sm"
            variant={calendarView === 'day' ? 'default' : 'outline'}
            onClick={() => setCalendarView('day')}
            className="text-xs sm:text-sm"
          >
            {t('calendar.day')}
          </Button>
        </div>
      </div>

      {/* Legend - Mobile Responsive */}
      <Card className="p-4">
        <div className="space-y-3">
          {/* Status Colors */}
          <div>
            <h4 className="text-sm font-medium mb-2">{t('calendar.status_legend')}</h4>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-warning"></div>
                <span>{t('common.status.pending')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary"></div>
                <span>{t('common.status.in_progress')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-success"></div>
                <span>{t('common.status.completed')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-destructive"></div>
                <span>{t('common.status.cancelled')}</span>
              </div>
            </div>
          </div>

          {/* Date Source Indicators */}
          <div>
            <h4 className="text-sm font-medium mb-2">{t('calendar.date_source_legend')}</h4>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 border-2 border-solid border-gray-500 bg-gray-400 rounded-sm"></div>
                <span>[DUE] {t('calendar.due_date')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 border-2 border-dashed border-gray-500 bg-gray-400 rounded-sm opacity-70"></div>
                <span>[SCH] {t('calendar.scheduled_date')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 border-2 border-dotted border-gray-500 bg-gray-400 rounded-sm opacity-70"></div>
                <span>[CRE] {t('calendar.created_date')}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-2 sm:p-6">
          <div style={{ height: '600px' }} className="w-full">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable={true}
              eventPropGetter={eventStyleGetter}
              view={calendarView}
              onView={setCalendarView}
              date={selectedDate}
              onNavigate={setSelectedDate}
              popup={true}
              popupOffset={{ x: 10, y: 10 }}
              className="order-calendar responsive-calendar"
              messages={{
                next: t('calendar.next'),
                previous: t('calendar.previous'),
                today: t('calendar.today'),
                month: t('calendar.month'),
                week: t('calendar.week'),
                day: t('calendar.day'),
                agenda: t('calendar.agenda'),
                date: t('calendar.date'),
                time: t('calendar.time'),
                event: t('calendar.event'),
                noEventsInRange: t('calendar.noEventsInRange'),
                showMore: (total: number) => `${t('calendar.showMore')} (${total})`
              }}
              formats={{
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }) => {
                  return `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`;
                },
                dayHeaderFormat: 'ddd DD/MM',
                monthHeaderFormat: 'MMMM YYYY',
                dayRangeHeaderFormat: ({ start, end }) => {
                  return `${moment(start).format('DD MMM')} - ${moment(end).format('DD MMM YYYY')}`;
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon(selectedOrder?.status)}
              {selectedOrder?.id}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <span className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  {selectedOrder.year} {selectedOrder.make} {selectedOrder.model}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Status and Priority */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={getStatusBadgeVariant(selectedOrder.status)}>
                  {t(`common.status.${selectedOrder.status?.toLowerCase()}`)}
                </Badge>
                {selectedOrder.priority && (
                  <Badge variant={selectedOrder.priority === 'high' ? 'destructive' : 'outline'}>
                    {t(`common.priority.${selectedOrder.priority}`)}
                  </Badge>
                )}
              </div>

              {/* Key Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Display all available dates with indicators */}
                {selectedOrder.due_date && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {t('common.due_date')} <Badge variant="default" className="text-xs">DUE</Badge>
                    </div>
                    <p className="text-sm mt-1">
                      {format(parseISO(selectedOrder.due_date), 'PPp')}
                    </p>
                  </div>
                )}

                {selectedOrder.scheduled_date && !selectedOrder.due_date && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {t('common.scheduled_date')} <Badge variant="secondary" className="text-xs">SCH</Badge>
                    </div>
                    <p className="text-sm mt-1">
                      {format(parseISO(selectedOrder.scheduled_date), 'PPp')}
                    </p>
                  </div>
                )}

                {!selectedOrder.due_date && !selectedOrder.scheduled_date && selectedOrder.created_at && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {t('common.created_at')} <Badge variant="outline" className="text-xs">CRE</Badge>
                    </div>
                    <p className="text-sm mt-1">
                      {format(parseISO(selectedOrder.created_at), 'PPp')}
                    </p>
                  </div>
                )}

                {selectedOrder.advisor && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <User className="h-4 w-4" />
                      {t('common.advisor')}
                    </div>
                    <p className="text-sm mt-1">{selectedOrder.advisor}</p>
                  </div>
                )}

                {selectedOrder.price && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      {t('common.price')}
                    </div>
                    <p className="text-sm mt-1">
                      ${parseFloat(selectedOrder.price).toFixed(2)}
                    </p>
                  </div>
                )}

                {selectedOrder.vin && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">VIN</div>
                    <p className="text-sm mt-1 font-mono">{selectedOrder.vin}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedOrder.description && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {t('common.description')}
                  </div>
                  <p className="text-sm bg-muted p-3 rounded">
                    {selectedOrder.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button 
                  onClick={() => onView(selectedOrder)}
                  className="flex-1"
                >
                  {t('common.view_details')}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => onEdit(selectedOrder)}
                  className="flex-1"
                >
                  {t('common.edit')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        .order-calendar {
          font-family: inherit !important;
        }
        
        .order-calendar .rbc-header {
          padding: 8px 4px;
          font-weight: 600;
          font-size: 14px;
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--muted));
        }
        
        .order-calendar .rbc-today {
          background-color: hsl(var(--accent) / 0.1);
        }
        
        .order-calendar .rbc-off-range-bg {
          background-color: hsl(var(--muted) / 0.3);
        }
        
        .order-calendar .rbc-event {
          padding: 2px 5px;
          border-radius: 4px;
          font-size: 11px;
          line-height: 1.2;
        }
        
        .order-calendar .rbc-time-slot {
          border-top: 1px solid hsl(var(--border));
        }
        
        .order-calendar .rbc-day-bg:hover {
          background-color: hsl(var(--accent) / 0.05);
        }
        
        @media (max-width: 640px) {
          .order-calendar .rbc-toolbar {
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
          }
          
          .order-calendar .rbc-toolbar-label {
            text-align: center;
            font-size: 16px;
          }
          
          .order-calendar .rbc-btn-group {
            display: flex;
            justify-content: center;
          }
          
          .order-calendar .rbc-btn-group button {
            padding: 4px 8px;
            font-size: 12px;
          }
          
          .order-calendar .rbc-event {
            font-size: 10px;
            padding: 1px 3px;
          }
          
          .order-calendar .rbc-header {
            padding: 4px 2px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};