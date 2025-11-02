import { useState } from "react";
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Settings,
  ExternalLink
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProductivityCalendars, ProductivityEvent } from "@/hooks/useProductivityCalendars";
import { format } from "date-fns";
import { useToast } from '@/hooks/use-toast';

const localizer = momentLocalizer(moment);

export const ProductivityCalendar = () => {
  const { t } = useTranslation();
  const { calendars, events, loading, createEvent, updateEvent, deleteEvent, createCalendar } = useProductivityCalendars();
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isCreateCalendarOpen, setIsCreateCalendarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ProductivityEvent | null>(null);
  const [calendarView, setCalendarView] = useState<View>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    all_day: false,
    location: "",
    event_type: "meeting" as const,
    calendar_id: "",
  });

  const [newCalendar, setNewCalendar] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    calendar_type: "internal" as const,
  });

  // Transform events for react-big-calendar
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: new Date(event.start_time),
    end: new Date(event.end_time),
    allDay: event.all_day,
    resource: event,
  }));

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.calendar_id) {
      toast({ variant: 'destructive', description: 'Please select a calendar' });
      return;
    }
    
    try {
      await createEvent(newEvent);
      setNewEvent({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        all_day: false,
        location: "",
        event_type: "meeting",
        calendar_id: "",
      });
      setIsCreateEventOpen(false);
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleCreateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCalendar(newCalendar);
      setNewCalendar({
        name: "",
        description: "",
        color: "#3B82F6",
        calendar_type: "internal",
      });
      setIsCreateCalendarOpen(false);
    } catch (error) {
      console.error('Failed to create calendar:', error);
    }
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setNewEvent({
      ...newEvent,
      start_time: start.toISOString().slice(0, 16),
      end_time: end.toISOString().slice(0, 16),
    });
    setIsCreateEventOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource);
  };

  const eventStyleGetter = (event: any) => {
    const calendar = calendars.find(cal => cal.id === event.resource.calendar_id);
    return {
      style: {
        backgroundColor: calendar?.color || '#3B82F6',
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">{format(selectedDate, 'MMMM yyyy')}</h2>
          <div className="flex items-center gap-2">
            {calendars.map((calendar) => (
              <Badge 
                key={calendar.id} 
                variant="outline" 
                className="flex items-center gap-2"
                style={{ borderColor: calendar.color }}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: calendar.color }}
                />
                {calendar.name}
                {calendar.calendar_type !== 'internal' && (
                  <ExternalLink className="h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isCreateCalendarOpen} onOpenChange={setIsCreateCalendarOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                {t('productivity.manageCalendars')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('productivity.createCalendar')}</DialogTitle>
                <DialogDescription>
                  {t('productivity.createCalendarDescription')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCalendar} className="space-y-4">
                <div>
                  <Label htmlFor="cal-name">{t('productivity.calendarName')}</Label>
                  <Input
                    id="cal-name"
                    value={newCalendar.name}
                    onChange={(e) => setNewCalendar({ ...newCalendar, name: e.target.value })}
                    placeholder={t('productivity.enterCalendarName')}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="cal-description">{t('productivity.description')}</Label>
                  <Textarea
                    id="cal-description"
                    value={newCalendar.description}
                    onChange={(e) => setNewCalendar({ ...newCalendar, description: e.target.value })}
                    placeholder={t('productivity.enterDescription')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cal-color">{t('productivity.color')}</Label>
                    <Input
                      id="cal-color"
                      type="color"
                      value={newCalendar.color}
                      onChange={(e) => setNewCalendar({ ...newCalendar, color: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cal-type">{t('productivity.calendarType')}</Label>
                    <Select value={newCalendar.calendar_type} onValueChange={(value) => setNewCalendar({ ...newCalendar, calendar_type: value as any })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">{t('productivity.calendarTypes.internal')}</SelectItem>
                        <SelectItem value="google">{t('productivity.calendarTypes.google')}</SelectItem>
                        <SelectItem value="outlook">{t('productivity.calendarTypes.outlook')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateCalendarOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">
                    {t('common.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('productivity.createEvent')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('productivity.createEvent')}</DialogTitle>
                <DialogDescription>
                  {t('productivity.createEventDescription')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <Label htmlFor="event-title">{t('productivity.title')}</Label>
                  <Input
                    id="event-title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder={t('productivity.enterEventTitle')}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="event-description">{t('productivity.description')}</Label>
                  <Textarea
                    id="event-description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder={t('productivity.enterDescription')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event-calendar">{t('productivity.calendar')}</Label>
                    <Select value={newEvent.calendar_id} onValueChange={(value) => setNewEvent({ ...newEvent, calendar_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('productivity.selectCalendar')} />
                      </SelectTrigger>
                      <SelectContent>
                        {calendars.map((calendar) => (
                          <SelectItem key={calendar.id} value={calendar.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: calendar.color }}
                              />
                              {calendar.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="event-type">{t('productivity.eventType')}</Label>
                    <Select value={newEvent.event_type} onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value as any })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">{t('productivity.eventTypes.meeting')}</SelectItem>
                        <SelectItem value="reminder">{t('productivity.eventTypes.reminder')}</SelectItem>
                        <SelectItem value="task">{t('productivity.eventTypes.task')}</SelectItem>
                        <SelectItem value="appointment">{t('productivity.eventTypes.appointment')}</SelectItem>
                        <SelectItem value="other">{t('productivity.eventTypes.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all-day"
                    checked={newEvent.all_day}
                    onCheckedChange={(checked) => setNewEvent({ ...newEvent, all_day: !!checked })}
                  />
                  <Label htmlFor="all-day" className="text-sm font-medium">
                    {t('productivity.allDay')}
                  </Label>
                </div>

                {!newEvent.all_day && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-time">{t('productivity.startTime')}</Label>
                      <Input
                        id="start-time"
                        type="datetime-local"
                        value={newEvent.start_time}
                        onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="end-time">{t('productivity.endTime')}</Label>
                      <Input
                        id="end-time"
                        type="datetime-local"
                        value={newEvent.end_time}
                        onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="location">{t('productivity.location')}</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder={t('productivity.enterLocation')}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateEventOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">
                    {t('common.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          <div style={{ height: '600px' }}>
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
              className="productivity-calendar"
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.event_type && t(`productivity.eventTypes.${selectedEvent.event_type}`)}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.description && (
                <div>
                  <Label>{t('productivity.description')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('productivity.startTime')}
                  </Label>
                  <p className="text-sm mt-1">
                    {format(new Date(selectedEvent.start_time), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('productivity.endTime')}
                  </Label>
                  <p className="text-sm mt-1">
                    {format(new Date(selectedEvent.end_time), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {selectedEvent.location && (
                <div>
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t('productivity.location')}
                  </Label>
                  <p className="text-sm mt-1">{selectedEvent.location}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => deleteEvent(selectedEvent.id)}
                  className="text-destructive hover:text-destructive"
                >
                  {t('common.delete')}
                </Button>
                <Button onClick={() => setSelectedEvent(null)}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};