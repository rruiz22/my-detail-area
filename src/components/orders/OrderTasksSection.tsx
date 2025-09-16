import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  User2,
  Calendar
} from 'lucide-react';
import { useProductivityTodos, ProductivityTodo } from '@/hooks/useProductivityTodos';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

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
  const { todos, createTodo, toggleTodoStatus } = useProductivityTodos();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Filter todos for this specific order
  const orderTodos = todos.filter(todo => todo.order_id === orderId);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    due_date: '',
    category: 'general'
  });

  const handleTemplateSelect = (templateIndex: string) => {
    if (templateIndex && templateIndex !== '') {
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
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Tasks &amp; Reminders
          </CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Task
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
                        <SelectItem value="">Custom Task</SelectItem>
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
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View All
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Order Context */}
        {customerName && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
            <User2 className="w-4 h-4" />
            <span>Customer: <strong>{customerName}</strong></span>
            <span className="text-gray-400">•</span>
            <span>Order: <strong>#{orderNumber}</strong></span>
          </div>
        )}

        {/* Progress Summary */}
        {orderTodos.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span>{pendingTasks.length} pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span>{completedTasks.length} completed</span>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-3">
          {orderTodos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No tasks created for this order yet</p>
              <p className="text-xs text-gray-400 mt-1">Create tasks to track follow-ups and deliverables</p>
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
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${
                    task.status === 'completed' ? 'bg-gray-50 opacity-75' : 'bg-white'
                  }`}
                >
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => toggleTodoStatus(task.id)}
                    className="mt-1"
                  />

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-medium ${
                        task.status === 'completed' ? 'line-through text-gray-500' : ''
                      }`}>
                        {task.title}
                      </h4>
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(task.status)}
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-xs text-gray-600">
                        {task.description}
                      </p>
                    )}

                    {task.due_date && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Show more indicator */}
        {orderTodos.length > 5 && (
          <div className="text-center pt-2">
            <Link to={`/productivity?order=${orderId}`}>
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                +{orderTodos.length - 5} more tasks
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};