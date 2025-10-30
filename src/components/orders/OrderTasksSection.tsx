import { AssignUserDialog } from '@/components/productivity/AssignUserDialog';
import { UserAvatar } from '@/components/productivity/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { ProductivityTodo, useProductivityTodos } from '@/hooks/useProductivityTodos';
import { format } from 'date-fns';
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink,
    Hash,
    Plus,
    UserPlus
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface OrderTasksSectionProps {
  orderId: string;
  orderNumber: string;
  customerName?: string;
}

const ORDER_TASK_TEMPLATES = [
  {
    title: 'Follow up with customer',
    category: 'customer_service',
    priority: 'medium' as const,
    description: 'Contact customer for status update and next steps'
  },
  {
    title: 'Schedule delivery appointment',
    category: 'logistics',
    priority: 'high' as const,
    description: 'Coordinate delivery time and location with customer'
  },
  {
    title: 'Process final payment',
    category: 'finance',
    priority: 'high' as const,
    description: 'Complete payment processing and documentation'
  },
  {
    title: 'Request customer review',
    category: 'marketing',
    priority: 'low' as const,
    description: 'Send review request and follow up on feedback'
  },
  {
    title: 'Schedule vehicle inspection',
    category: 'quality',
    priority: 'high' as const,
    description: 'Quality control inspection before delivery'
  },
  {
    title: 'Prepare delivery documentation',
    category: 'documentation',
    priority: 'medium' as const,
    description: 'Gather all required paperwork for vehicle delivery'
  }
];

export const OrderTasksSection: React.FC<OrderTasksSectionProps> = ({
  orderId,
  orderNumber,
  customerName
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { todos, createTodo, updateTodo, toggleTodoStatus } = useProductivityTodos();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [taskToAssign, setTaskToAssign] = useState<ProductivityTodo | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'my_tasks' | 'pending' | 'completed'>('all');

  // Filter todos for this specific order
  let orderTodos = todos.filter(todo => todo.order_id === orderId);

  // Apply additional filters
  if (taskFilter === 'my_tasks') {
    orderTodos = orderTodos.filter(todo => todo.assigned_to === user?.id || todo.created_by === user?.id);
  } else if (taskFilter === 'pending') {
    orderTodos = orderTodos.filter(todo => todo.status !== 'completed' && todo.status !== 'cancelled');
  } else if (taskFilter === 'completed') {
    orderTodos = orderTodos.filter(todo => todo.status === 'completed');
  }

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    due_date: '',
    category: 'general'
  });

  const handleTemplateSelect = (templateIndex: string) => {
    if (templateIndex && templateIndex !== 'custom') {
      const template = ORDER_TASK_TEMPLATES[parseInt(templateIndex)];
      if (template) {
        setNewTask({
          title: template.title,
          description: template.description,
          priority: template.priority,
          due_date: '',
          category: template.category
        });
      }
    }
    setSelectedTemplate(templateIndex);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTodo({
        ...newTask,
        order_id: orderId
      });

      // Reset form
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        category: 'general'
      });
      setSelectedTemplate('');
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleAssignUser = async (userId: string | null) => {
    if (!taskToAssign) return;
    try {
      await updateTodo(taskToAssign.id, {
        assigned_to: userId
      });
      setTaskToAssign(null);
    } catch (error) {
      console.error('Failed to assign user:', error);
    }
  };

  const openAssignDialog = (task: ProductivityTodo) => {
    setTaskToAssign(task);
    setIsAssignOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const pendingTasks = orderTodos.filter(task => task.status !== 'completed' && task.status !== 'cancelled');
  const completedTasks = orderTodos.filter(task => task.status === 'completed');

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-4 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold">Tasks &amp; Reminders</span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="font-medium shadow-sm hover:shadow-md transition-shadow h-7 px-2 gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task for Order #{orderNumber}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <Label htmlFor="template">Quick Templates</Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template or create custom" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom Task</SelectItem>
                        {ORDER_TASK_TEMPLATES.map((template, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {template.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title">Task Title</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Enter task title"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Task description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value as any })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="datetime-local"
                        value={newTask.due_date}
                        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Create Task
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {orderTodos.length > 0 && (
              <Link to={`/productivity?order=${orderId}`}>
                <Button variant="outline" size="sm" className="font-medium shadow-sm hover:shadow-md transition-shadow h-7 px-2 gap-1.5 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">View</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        {todos.filter(todo => todo.order_id === orderId).length > 0 && (
          <Tabs value={taskFilter} onValueChange={(value) => setTaskFilter(value as any)}>
            <TabsList className="grid w-full grid-cols-4 bg-muted/40">
              <TabsTrigger value="all" className="text-xs font-medium">All</TabsTrigger>
              <TabsTrigger value="my_tasks" className="text-xs font-medium">My Tasks</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs font-medium">Pending</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs font-medium">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Order Context */}
        <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-gradient-to-r from-background to-muted/30 border border-border/50 shadow-sm">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Hash className="w-4 h-4 text-primary" />
          </div>
          <span className="text-foreground">Order: <strong className="font-bold">#{orderNumber}</strong></span>
        </div>

        {/* Progress Summary */}
        {orderTodos.length > 0 && (
          <div className="flex items-center gap-4 sm:gap-6 text-sm p-3 rounded-xl bg-muted/40 border border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full ring-2 ring-amber-200"></div>
              <span className="font-medium text-foreground">{pendingTasks.length} <span className="text-muted-foreground hidden sm:inline">pending</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-emerald-200"></div>
              <span className="font-medium text-foreground">{completedTasks.length} <span className="text-muted-foreground hidden sm:inline">completed</span></span>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-3">
          {orderTodos.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl bg-muted/40 border-2 border-dashed border-border">
              <div className="p-3 rounded-lg bg-muted/60 inline-block mb-3">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-foreground">No tasks created for this order yet</p>
              <p className="text-xs text-muted-foreground mt-2">Create tasks to track follow-ups and deliverables</p>
            </div>
          ) : (
            orderTodos
              .sort((a, b) => {
                // Sort by: 1. Status (pending first), 2. Priority, 3. Due date
                if (a.status !== b.status) {
                  if (a.status === 'completed') return 1;
                  if (b.status === 'completed') return -1;
                }

                const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
                const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;

                if (aPriority !== bPriority) return aPriority - bPriority;

                if (a.due_date && b.due_date) {
                  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                }

                return 0;
              })
              .slice(0, 5) // Show max 5 tasks in preview
              .map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border border-border/50 transition-all hover:shadow-md ${
                    task.status === 'completed'
                      ? 'bg-gradient-to-r from-muted/60 to-muted/40 opacity-75'
                      : 'bg-gradient-to-r from-background to-muted/30 shadow-sm hover:border-primary/20'
                  }`}
                >
                  <div className="mt-0.5">
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => toggleTodoStatus(task.id)}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-bold ${
                        task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}>
                        {task.title}
                      </h4>
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs font-medium px-2">
                        {task.priority}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(task.status)}
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-xs text-muted-foreground font-medium">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap text-xs">
                      {task.due_date && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/60">
                          <Calendar className="w-3 h-3 text-primary" />
                          <span className="font-medium text-foreground">
                            Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      )}

                      {task.assigned_to && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/60">
                          <UserAvatar userId={task.assigned_to} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignment button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 flex-shrink-0 hover:bg-primary/10"
                    onClick={() => openAssignDialog(task)}
                    title="Assign task"
                  >
                    <UserPlus className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              ))
          )}
        </div>

        {/* Show more indicator */}
        {orderTodos.length > 5 && (
          <div className="text-center pt-2">
            <Link to={`/productivity?order=${orderId}`}>
              <Button
                variant="ghost"
                size="sm"
                className="font-medium text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
              >
                +{orderTodos.length - 5} more tasks
              </Button>
            </Link>
          </div>
        )}
      </CardContent>

      {/* Assignment Dialog */}
      <AssignUserDialog
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        currentAssignedUserId={taskToAssign?.assigned_to}
        onAssign={handleAssignUser}
        taskTitle={taskToAssign?.title}
      />
    </Card>
  );
};
