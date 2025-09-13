import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Plus,
  TrendingUp,
  ListTodo
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProductivityTodos } from "@/hooks/useProductivityTodos";
import { useProductivityCalendars } from "@/hooks/useProductivityCalendars";
import { format, isToday, isTomorrow } from "date-fns";

export const ProductivityDashboard = () => {
  const { t } = useTranslation();
  const { todos, loading: todosLoading } = useProductivityTodos();
  const { events, loading: eventsLoading } = useProductivityCalendars();

  const todayEvents = events.filter(event => 
    isToday(new Date(event.start_time))
  );

  const tomorrowEvents = events.filter(event => 
    isTomorrow(new Date(event.start_time))
  );

  const overdueTodos = todos.filter(todo => 
    todo.due_date && 
    new Date(todo.due_date) < new Date() && 
    todo.status !== 'completed'
  );

  const urgentTodos = todos.filter(todo => 
    todo.priority === 'urgent' && 
    todo.status !== 'completed'
  );

  const completedTodos = todos.filter(todo => todo.status === 'completed');
  const totalTodos = todos.length;
  const completionRate = totalTodos > 0 ? (completedTodos.length / totalTodos) * 100 : 0;

  const pendingTodos = todos.filter(todo => todo.status === 'pending');
  const inProgressTodos = todos.filter(todo => todo.status === 'in_progress');

  if (todosLoading || eventsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('productivity.stats.totalTodos')}
            </CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTodos}</div>
            <p className="text-xs text-muted-foreground">
              {completedTodos.length} {t('productivity.stats.completed')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('productivity.stats.todayEvents')}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              {tomorrowEvents.length} {t('productivity.stats.tomorrow')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('productivity.stats.overdue')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueTodos.length}</div>
            <p className="text-xs text-muted-foreground">
              {urgentTodos.length} {t('productivity.stats.urgent')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('productivity.stats.completion')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Todos & Today's Events */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {t('productivity.recentTodos')}
            </CardTitle>
            <CardDescription>
              {t('productivity.recentTodosDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {todos.slice(0, 5).map((todo) => (
              <div key={todo.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    todo.priority === 'urgent' ? 'bg-destructive' :
                    todo.priority === 'high' ? 'bg-orange-500' :
                    todo.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{todo.title}</p>
                    {todo.due_date && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(todo.due_date), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={
                  todo.status === 'completed' ? 'default' :
                  todo.status === 'in_progress' ? 'secondary' : 'outline'
                }>
                  {todo.status}
                </Badge>
              </div>
            ))}
            
            {todos.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <ListTodo className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('productivity.noTodos')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('productivity.todayEvents')}
            </CardTitle>
            <CardDescription>
              {t('productivity.todayEventsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {event.event_type}
                </Badge>
              </div>
            ))}
            
            {todayEvents.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('productivity.noEventsToday')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};