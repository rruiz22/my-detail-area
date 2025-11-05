import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  CheckSquare,
  Car,
  Grid3x3,
  List,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCalendarData, CalendarItem } from '@/hooks/useCalendarData';
import { useProductivityCalendars } from '@/hooks/useProductivityCalendars';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { usePersistedState } from '@/hooks/usePersistedState';

// Modern Event Card Component with drag support and tooltip
const EventCard = ({
  item,
  onSelect,
  isDragging,
}: {
  item: CalendarItem;
  onSelect: (item: CalendarItem) => void;
  isDragging?: boolean;
}) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: item,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const getTypeIcon = () => {
    switch (item.type) {
      case 'event':
        return <CalendarIcon className="h-3 w-3" />;
      case 'todo':
        return <CheckSquare className="h-3 w-3" />;
      case 'order':
        return <Car className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getTypeBadge = () => {
    const typeMap = {
      event: t('productivity.events'),
      todo: t('productivity.todos'),
      order: t('common.orders'),
    };
    return typeMap[item.type] || item.type;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={cn(
            'group relative px-2 py-1 mb-1 rounded text-xs transition-all',
            isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab hover:shadow-md hover:scale-102 hover:z-10',
            item.type === 'event' && 'bg-blue-50 border-l-2 border-blue-500 text-blue-900',
            item.type === 'todo' && 'bg-amber-50 border-l-2 border-amber-500 text-amber-900',
            item.type === 'order' && 'bg-purple-50 border-l-2 border-purple-500 text-purple-900'
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{item.title}</div>
              {!item.allDay && (
                <div className="text-[10px] opacity-75 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {format(item.start, 'HH:mm')}
                </div>
              )}
            </div>
            {item.priority && (
              <div className={cn(
                'w-1.5 h-1.5 rounded-full',
                item.priority === 'urgent' && 'bg-red-500',
                item.priority === 'high' && 'bg-orange-500',
                item.priority === 'medium' && 'bg-yellow-500',
                item.priority === 'low' && 'bg-green-500'
              )} />
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="max-w-xs p-0 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item);
        }}
      >
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            {getTypeIcon()}
            <span className="font-semibold">{item.title}</span>
          </div>

          {item.description && (
            <p className="text-xs text-muted-foreground">{item.description}</p>
          )}

          <div className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            <span>
              {item.allDay
                ? t('productivity.allDay')
                : `${format(item.start, 'HH:mm')} - ${format(item.end, 'HH:mm')}`
              }
            </span>
          </div>

          {item.location && (
            <div className="flex items-center gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              <span>{item.location}</span>
            </div>
          )}

          <div className="pt-1 border-t">
            <Badge variant="outline" className="text-[10px]">
              {getTypeBadge()}
            </Badge>
            {item.status && (
              <Badge variant="secondary" className="text-[10px] ml-1">
                {item.status}
              </Badge>
            )}
            {item.priority && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] ml-1",
                  item.priority === 'urgent' && 'border-red-500 text-red-700',
                  item.priority === 'high' && 'border-orange-500 text-orange-700',
                  item.priority === 'medium' && 'border-yellow-500 text-yellow-700',
                  item.priority === 'low' && 'border-green-500 text-green-700'
                )}
              >
                {item.priority}
              </Badge>
            )}
          </div>

          <div className="text-[10px] text-muted-foreground text-center pt-1 border-t italic">
            {t('common.click')} {t('common.view_details')}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Droppable Day Cell
const DayCell = ({
  date,
  items,
  isCurrentMonth,
  onSelect,
}: {
  date: Date;
  items: CalendarItem[];
  isCurrentMonth: boolean;
  onSelect: (item: CalendarItem) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: date.toISOString(),
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[100px] border border-gray-200 p-1 transition-colors',
        !isCurrentMonth && 'bg-gray-50/50 text-muted-foreground',
        isToday(date) && 'bg-blue-50/30 ring-1 ring-blue-500 ring-inset',
        isOver && 'bg-blue-100/50 ring-2 ring-blue-500'
      )}
    >
      <div
        className={cn(
          'text-right text-sm font-medium mb-1 px-1',
          isToday(date) && 'text-blue-600'
        )}
      >
        {format(date, 'd')}
      </div>
      <div className="space-y-0.5">
        {items.slice(0, 3).map((item) => (
          <EventCard key={item.id} item={item} onSelect={onSelect} />
        ))}
        {items.length > 3 && (
          <div className="text-xs text-muted-foreground text-center py-0.5">
            +{items.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
};

export const ProductivityCalendar = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { calendarItems, loading } = useCalendarData();
  const { calendars, createEvent, updateEvent } = useProductivityCalendars();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  // Persistent view mode
  const [viewMode, setViewMode] = usePersistedState<'month' | 'list'>(
    'productivity.calendar.viewMode',
    'month',
    { debounceMs: 100 }
  );

  // Persistent filters
  const [activeFilters, setActiveFilters] = usePersistedState(
    'productivity.calendar.filters',
    { events: true, todos: true, orders: true },
    { debounceMs: 100 }
  );

  const [draggedItem, setDraggedItem] = useState<CalendarItem | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false,
    location: '',
    event_type: 'meeting' as const,
    calendar_id: '',
  });

  // Get calendar days for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Filter items
  const filteredItems = useMemo(() => {
    return calendarItems.filter(item => {
      if (item.type === 'event' && !activeFilters.events) return false;
      if (item.type === 'todo' && !activeFilters.todos) return false;
      if (item.type === 'order' && !activeFilters.orders) return false;
      return true;
    });
  }, [calendarItems, activeFilters]);

  // Group items by day
  const itemsByDay = useMemo(() => {
    const grouped: Record<string, CalendarItem[]> = {};
    filteredItems.forEach(item => {
      const dayKey = format(item.start, 'yyyy-MM-dd');
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(item);
    });
    return grouped;
  }, [filteredItems]);

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (!over || !active.data.current) return;

    const item = active.data.current as CalendarItem;
    const newDate = parseISO(over.id as string);

    if (item.type === 'event' && item.eventId) {
      try {
        const duration = item.end.getTime() - item.start.getTime();
        const newStart = newDate;
        const newEnd = new Date(newDate.getTime() + duration);

        await updateEvent(item.eventId, {
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        });

        toast({ description: t('productivity.eventMoved') || 'Event moved successfully' });
      } catch (error) {
        console.error('Error moving event:', error);
        toast({
          variant: 'destructive',
          description: t('productivity.eventMoveFailed') || 'Failed to move event',
        });
      }
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.calendar_id) {
      toast({ variant: 'destructive', description: 'Please select a calendar' });
      return;
    }

    try {
      await createEvent(newEvent);
      setNewEvent({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        all_day: false,
        location: '',
        event_type: 'meeting',
        calendar_id: '',
      });
      setIsCreateEventOpen(false);
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  // Get upcoming items (next 7 days) - MOVED BEFORE CONDITIONAL RETURN
  const upcomingItems = useMemo(() => {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return filteredItems
      .filter(item => item.start >= now && item.start <= sevenDaysLater)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 10); // Limit to 10 items
  }, [filteredItems]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-96 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <DndContext onDragEnd={handleDragEnd} onDragStart={(e) => setDraggedItem(e.active.data.current as CalendarItem)}>
        {/* Main Grid Layout: Sidebar + Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
          {/* Left Sidebar - Upcoming Activity */}
          <Card className="h-fit max-h-[calc(100vh-200px)] lg:sticky lg:top-4">
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                    {t('productivity.upcomingActivity')}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {t('productivity.nextDays', { count: 7 })}
                  </Badge>
                </div>

                <ScrollArea className="h-[calc(100vh-280px)]">
                  {upcomingItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">{t('productivity.noUpcomingActivity')}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {upcomingItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="w-full text-left p-2 rounded-md border hover:border-primary/50 hover:bg-accent/50 transition-all group"
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className="w-0.5 h-full rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <div className={cn(
                                  "w-4 h-4 rounded flex items-center justify-center text-[10px]",
                                  item.type === 'event' && "bg-blue-100 text-blue-700",
                                  item.type === 'todo' && "bg-amber-100 text-amber-700",
                                  item.type === 'order' && "bg-purple-100 text-purple-700"
                                )}>
                                  {item.type === 'event' ? '📅' : item.type === 'todo' ? '✓' : '🚗'}
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {format(item.start, 'MMM d, h:mm a')}
                                </span>
                                {item.priority && (
                                  <div className={cn(
                                    'w-1.5 h-1.5 rounded-full ml-auto',
                                    item.priority === 'urgent' && 'bg-red-500',
                                    item.priority === 'high' && 'bg-orange-500',
                                    item.priority === 'medium' && 'bg-yellow-500',
                                    item.priority === 'low' && 'bg-green-500'
                                  )} />
                                )}
                              </div>
                              <p className="font-medium text-xs truncate group-hover:text-primary transition-colors">
                                {item.title}
                              </p>
                              {item.description && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Right Side - Calendar */}
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                {t('time.today')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
            </div>
  
            {/* Filters and Actions */}
            <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={activeFilters.events ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilters({ ...activeFilters, events: !activeFilters.events })}
                  className="gap-2"
                >
                  {activeFilters.events ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('productivity.events')}</span>
                </Button>
                <Button
                  variant={activeFilters.todos ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilters({ ...activeFilters, todos: !activeFilters.todos })}
                  className="gap-2"
                >
                  {activeFilters.todos ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <CheckSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('productivity.todos')}</span>
                </Button>
                <Button
                  variant={activeFilters.orders ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilters({ ...activeFilters, orders: !activeFilters.orders })}
                  className="gap-2"
                >
                  {activeFilters.orders ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <Car className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.orders')}</span>
                </Button>
  
                {/* Create Event Button */}
                <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
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
                      <Label htmlFor="event-description">{t('common.description')}</Label>
                      <Textarea
                        id="event-description"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        placeholder={t('productivity.enterDescription')}
                      />
                    </div>
  
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="event-calendar">{t('nav.calendar')}</Label>
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
                      <Label htmlFor="all-day">{t('productivity.allDay')}</Label>
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
              </div> {/* Close filters and actions */}
            </div> {/* Close header */}

          {/* View Mode Toggle - Above Calendar */}
          <div className="flex justify-end">
            <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="h-7 px-2 gap-1.5 text-xs"
              >
                <Grid3x3 className="h-3 w-3" />
                <span className="hidden sm:inline">{t('productivity.monthView')}</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-7 px-2 gap-1.5 text-xs"
              >
                <List className="h-3 w-3" />
                <span className="hidden sm:inline">{t('productivity.listView')}</span>
              </Button>
            </div>
          </div>
  
          {/* Calendar Grid */}
          {viewMode === 'month' ? (
            <Card>
              <CardContent className="p-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
  
                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {calendarDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayItems = itemsByDay[dayKey] || [];
                    return (
                      <DayCell
                        key={dayKey}
                        date={day}
                        items={dayItems}
                        isCurrentMonth={isSameMonth(day, currentDate)}
                        onSelect={setSelectedItem}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            // List View
            <Card>
              <CardContent className="p-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {Object.keys(itemsByDay)
                      .sort()
                      .map((dayKey) => {
                        const day = parseISO(dayKey);
                        const dayItems = itemsByDay[dayKey];
                        return (
                          <div key={dayKey} className="space-y-2">
                            <h3 className="font-semibold text-sm text-muted-foreground sticky top-0 bg-background py-2">
                              {format(day, 'EEEE, MMMM d, yyyy')}
                            </h3>
                            <div className="space-y-1 pl-4">
                              {dayItems.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => setSelectedItem(item)}
                                  className="cursor-pointer p-3 rounded-lg border hover:shadow-md transition-all"
                                  style={{ borderLeftWidth: '4px', borderLeftColor: item.color }}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="font-medium">{item.title}</div>
                                      {item.description && (
                                        <div className="text-sm text-muted-foreground mt-1">{item.description}</div>
                                      )}
                                      {!item.allDay && (
                                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {format(item.start, 'HH:mm')} - {format(item.end, 'HH:mm')}
                                        </div>
                                      )}
                                    </div>
                                    <Badge variant="outline">
                                      {item.type === 'event' && <CalendarIcon className="h-3 w-3 mr-1" />}
                                      {item.type === 'todo' && <CheckSquare className="h-3 w-3 mr-1" />}
                                      {item.type === 'order' && <Car className="h-3 w-3 mr-1" />}
                                      {item.type}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Item Details Dialog */}
          <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedItem?.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Badge>
                  {selectedItem?.type === 'event' && <CalendarIcon className="h-3 w-3 mr-1" />}
                  {selectedItem?.type === 'todo' && <CheckSquare className="h-3 w-3 mr-1" />}
                  {selectedItem?.type === 'order' && <Car className="h-3 w-3 mr-1" />}
                  {selectedItem?.type}
                </Badge>
              </DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                {selectedItem.description && (
                  <div>
                    <Label>{t('common.description')}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedItem.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t('productivity.startTime')}
                    </Label>
                    <p className="text-sm mt-1">
                      {format(selectedItem.start, 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t('productivity.endTime')}
                    </Label>
                    <p className="text-sm mt-1">
                      {format(selectedItem.end, 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>

                {selectedItem.location && (
                  <div>
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {t('productivity.location')}
                    </Label>
                    <p className="text-sm mt-1">{selectedItem.location}</p>
                  </div>
                )}

                {selectedItem.status && (
                  <div>
                    <Label>{t('common.status')}</Label>
                    <Badge className="mt-1">{selectedItem.status}</Badge>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setSelectedItem(null)}>
                    {t('common.close')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
          </Dialog>

          </div> {/* Close right side calendar */}
        </div> {/* Close main grid */}

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedItem && (
            <div className="bg-white shadow-lg rounded p-2 border-2 border-blue-500">
              {draggedItem.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
};
