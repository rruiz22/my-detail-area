import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Car, MoreVertical, Edit, Trash2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProductivityTodos, ProductivityTodo } from "@/hooks/useProductivityTodos";
import { useOrderContext } from "@/hooks/useOrderContext";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// Component to display order number inline with proper formatting
const OrderLinkInline = ({ orderId }: { orderId: string }) => {
  const { orderData, loading } = useOrderContext(orderId);

  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <Car className="h-3 w-3" />
        <span className="text-muted-foreground text-xs">
          Order #{orderId.slice(-8)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Car className="h-3 w-3" />
      <Link
        to={`/productivity?order=${orderId}`}
        className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
      >
        Order #{orderData?.orderNumber || orderId.slice(-8)}
      </Link>
    </div>
  );
};

interface KanbanColumnProps {
  title: string;
  status: string;
  todos: ProductivityTodo[];
  count: number;
  color: string;
  onToggleStatus: (id: string) => void;
  onEdit: (todo: ProductivityTodo) => void;
  onDelete: (id: string) => void;
}

const KanbanColumn = ({ title, status, todos, count, color, onToggleStatus, onEdit, onDelete }: KanbanColumnProps) => {
  const { t } = useTranslation();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className={cn(
        "rounded-t-lg p-4 border-b-2",
        color
      )}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Badge variant="secondary" className="font-bold">
            {count}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-3 space-y-3 bg-muted/20 rounded-b-lg overflow-y-auto min-h-[500px]">
        {todos
          .filter(todo => todo.status === status)
          .sort((a, b) => {
            // Sort by priority (urgent -> low)
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
            const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;

            if (aPriority !== bPriority) return aPriority - bPriority;

            // Then by due date
            if (a.due_date && b.due_date) {
              return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            }

            return 0;
          })
          .map((todo) => (
            <Card
              key={todo.id}
              className={cn(
                "transition-all hover:shadow-md cursor-pointer border-l-4",
                todo.priority === 'urgent' ? 'border-l-red-500' :
                todo.priority === 'high' ? 'border-l-orange-500' :
                todo.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500',
                status === 'completed' && 'opacity-75'
              )}
            >
              <CardContent className="p-3 space-y-2">
                {/* Title and Priority */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <Checkbox
                      checked={todo.status === 'completed'}
                      onCheckedChange={() => onToggleStatus(todo.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h4 className={cn(
                        "font-medium text-sm",
                        todo.status === 'completed' && 'line-through text-muted-foreground'
                      )}>
                        {todo.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      getPriorityColor(todo.priority)
                    )} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(todo)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(todo.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Description */}
                {todo.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {todo.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  {todo.due_date && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(todo.due_date), 'MMM dd, HH:mm')}</span>
                    </div>
                  )}
                  {todo.order_id && (
                    <OrderLinkInline orderId={todo.order_id} />
                  )}
                  {todo.category && todo.category !== 'general' && (
                    <Badge variant="outline" className="text-xs w-fit">
                      {todo.category}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

        {/* Empty State */}
        {todos.filter(todo => todo.status === status).length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const ProductivityKanban = () => {
  const { t } = useTranslation();
  const { todos, loading, toggleTodoStatus, deleteTodo } = useProductivityTodos();
  const [editingTodo, setEditingTodo] = useState<ProductivityTodo | null>(null);

  // Count todos by status
  const counts = {
    pending: todos.filter(t => t.status === 'pending').length,
    in_progress: todos.filter(t => t.status === 'in_progress').length,
    completed: todos.filter(t => t.status === 'completed').length,
    cancelled: todos.filter(t => t.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-24 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KanbanColumn
          title={t('productivity.status.pending')}
          status="pending"
          todos={todos}
          count={counts.pending}
          color="bg-gray-100 border-gray-300"
          onToggleStatus={toggleTodoStatus}
          onEdit={setEditingTodo}
          onDelete={deleteTodo}
        />

        <KanbanColumn
          title={t('productivity.status.inProgress')}
          status="in_progress"
          todos={todos}
          count={counts.in_progress}
          color="bg-blue-100 border-blue-300"
          onToggleStatus={toggleTodoStatus}
          onEdit={setEditingTodo}
          onDelete={deleteTodo}
        />

        <KanbanColumn
          title={t('productivity.status.completed')}
          status="completed"
          todos={todos}
          count={counts.completed}
          color="bg-green-100 border-green-300"
          onToggleStatus={toggleTodoStatus}
          onEdit={setEditingTodo}
          onDelete={deleteTodo}
        />

        <KanbanColumn
          title={t('productivity.status.cancelled')}
          status="cancelled"
          todos={todos}
          count={counts.cancelled}
          color="bg-red-100 border-red-300"
          onToggleStatus={toggleTodoStatus}
          onEdit={setEditingTodo}
          onDelete={deleteTodo}
        />
      </div>

      {/* Empty State */}
      {todos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium mb-2">{t('productivity.noTodos')}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t('productivity.createFirstTodo')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
