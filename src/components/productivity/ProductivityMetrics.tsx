import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  User
} from 'lucide-react';
import { useProductivityTodos, ProductivityTodo } from '@/hooks/useProductivityTodos';
import { format, isToday, isPast, parseISO } from 'date-fns';

interface ProductivityMetricsProps {
  todos: ProductivityTodo[];
  className?: string;
}

export const ProductivityMetrics: React.FC<ProductivityMetricsProps> = ({
  todos,
  className = ''
}) => {
  // Calculate metrics
  const totalTodos = todos.length;
  const completedTodos = todos.filter(todo => todo.status === 'completed').length;
  const pendingTodos = todos.filter(todo => todo.status === 'pending').length;
  const inProgressTodos = todos.filter(todo => todo.status === 'in_progress').length;

  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  // Due date analysis
  const todayTasks = todos.filter(todo =>
    todo.due_date && isToday(parseISO(todo.due_date)) && todo.status !== 'completed'
  );

  const overdueTasks = todos.filter(todo =>
    todo.due_date && isPast(parseISO(todo.due_date)) && !isToday(parseISO(todo.due_date)) && todo.status !== 'completed'
  );

  const urgentTasks = todos.filter(todo =>
    todo.priority === 'urgent' && todo.status !== 'completed'
  );

  // Order-linked tasks
  const orderLinkedTasks = todos.filter(todo => todo.order_id);
  const orderLinkedPercentage = totalTodos > 0 ? Math.round((orderLinkedTasks.length / totalTodos) * 100) : 0;

  // Recent activity (tasks completed in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentlyCompleted = todos.filter(todo =>
    todo.status === 'completed' &&
    todo.completed_at &&
    new Date(todo.completed_at) >= sevenDaysAgo
  ).length;

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Total & Completion Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Completion Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold">{completionRate}%</div>
          <Progress
            value={completionRate}
            className="h-2"
          />
          <div className="text-xs text-gray-600">
            {completedTodos} of {totalTodos} tasks completed
          </div>
        </CardContent>
      </Card>

      {/* Active Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Active Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold">{pendingTodos + inProgressTodos}</div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              {pendingTodos} pending
            </Badge>
            <Badge variant="default" className="text-xs">
              {inProgressTodos} in progress
            </Badge>
          </div>
          <div className="text-xs text-gray-600">
            {recentlyCompleted} completed this week
          </div>
        </CardContent>
      </Card>

      {/* Due Today & Overdue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Due Today
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold text-blue-600">{todayTasks.length}</div>
          <div className="space-y-2">
            {overdueTasks.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueTasks.length} overdue
              </Badge>
            )}
            {urgentTasks.length > 0 && (
              <Badge variant="default" className="text-xs bg-orange-500">
                {urgentTasks.length} urgent
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-600">
            Focus on high priority items
          </div>
        </CardContent>
      </Card>

      {/* Order Integration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Order Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold text-purple-600">{orderLinkedTasks.length}</div>
          <Progress
            value={orderLinkedPercentage}
            className="h-2"
          />
          <div className="text-xs text-gray-600">
            {orderLinkedPercentage}% of tasks linked to orders
          </div>
        </CardContent>
      </Card>
    </div>
  );
};