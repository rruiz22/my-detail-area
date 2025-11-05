import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Car,
  ExternalLink,
  X,
  List,
  LayoutGrid,
  AlertCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProductivityTodos, ProductivityTodo } from "@/hooks/useProductivityTodos";
import { useOrderContext } from "@/hooks/useOrderContext";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useSearchParams } from "react-router-dom";
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

export const ProductivityTodos = () => {
  const { t } = useTranslation();
  const { todos, loading, createTodo, updateTodo, deleteTodo, toggleTodoStatus } = useProductivityTodos();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<ProductivityTodo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Order filter from URL params
  const orderFilter = searchParams.get('order') || '';
  const orderTodos = orderFilter ? todos.filter(todo => todo.order_id === orderFilter) : [];
  const isOrderFiltered = !!orderFilter;

  // Get order context for enriched display
  const { orderData } = useOrderContext(orderFilter || null);

  const [newTodo, setNewTodo] = useState({
    title: "",
    description: "",
    priority: "medium" as const,
    due_date: "",
    category: "general",
  });

  const filteredTodos = (isOrderFiltered ? orderTodos : todos).filter(todo => {
    const matchesSearch = todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         todo.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || todo.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || todo.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const clearOrderFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('order');
    setSearchParams(newParams);
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const todoData = {
        ...newTodo,
        ...(isOrderFiltered && { order_id: orderFilter })
      };
      await createTodo(todoData);
      setNewTodo({
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
        category: "general",
      });
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleUpdateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo) return;

    try {
      await updateTodo(editingTodo.id, editingTodo);
      setEditingTodo(null);
    } catch (error) {
      console.error('Failed to update todo:', error);
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

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Kanban columns
  const kanbanColumns = [
    { status: 'pending', title: t('productivity.status.pending'), color: 'bg-gray-100 border-gray-300' },
    { status: 'in_progress', title: t('productivity.status.inProgress'), color: 'bg-blue-100 border-blue-300' },
    { status: 'completed', title: t('productivity.status.completed'), color: 'bg-green-100 border-green-300' },
    { status: 'cancelled', title: t('productivity.status.cancelled'), color: 'bg-red-100 border-red-300' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Order Context Alert */}
      {isOrderFiltered && (
        <Card className="border-blue-200 bg-blue-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Car className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-sm font-bold text-blue-900">
                      {t('productivity.tasksForOrder')} #{orderData?.orderNumber || orderFilter.slice(-8)}
                    </p>
                    {orderData && (
                      <div className="text-xs text-blue-700 space-y-1">
                        <p>{t('common.customer')}: <strong>{orderData.customerName}</strong></p>
                        {orderData.vehicleMake && orderData.vehicleModel && (
                          <p>{t('common.vehicle')}: <strong>{orderData.vehicleYear} {orderData.vehicleMake} {orderData.vehicleModel}</strong></p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-blue-600 mt-1">
                      {filteredTodos.length} {t('productivity.tasks')} •
                      {filteredTodos.filter(t => t.status === 'completed').length} {t('productivity.completed')}
                    </p>
                  </div>
                </div>
                <Link to={`/orders`}>
                  <Button variant="outline" size="sm" className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-100">
                    <ExternalLink className="w-4 h-4" />
                    {t('productivity.viewOrder')}
                  </Button>
                </Link>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearOrderFilter}
                className="text-blue-700 hover:bg-blue-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4 flex-1 w-full">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('productivity.searchTodos')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('productivity.status.label')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('productivity.filters.all')}</SelectItem>
              <SelectItem value="pending">{t('productivity.status.pending')}</SelectItem>
              <SelectItem value="in_progress">{t('productivity.status.inProgress')}</SelectItem>
              <SelectItem value="completed">{t('productivity.status.completed')}</SelectItem>
              <SelectItem value="cancelled">{t('productivity.status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('productivity.priority.label')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('productivity.filters.all')}</SelectItem>
              <SelectItem value="urgent">{t('productivity.priority.urgent')}</SelectItem>
              <SelectItem value="high">{t('productivity.priority.high')}</SelectItem>
              <SelectItem value="medium">{t('productivity.priority.medium')}</SelectItem>
              <SelectItem value="low">{t('productivity.priority.low')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">{t('productivity.listView')}</span>
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">{t('productivity.kanbanView')}</span>
            </Button>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('productivity.createTodo')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isOrderFiltered
                    ? `${t('productivity.createTaskFor')} #${orderData?.orderNumber || orderFilter.slice(-8)}`
                    : t('productivity.createTodo')
                  }
                </DialogTitle>
                <DialogDescription>
                  {isOrderFiltered
                    ? `${t('productivity.taskWillBeLinked')} #${orderData?.orderNumber || orderFilter.slice(-8)}`
                    : t('productivity.createTodoDescription')
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTodo} className="space-y-4">
                <div>
                  <Label htmlFor="title">{t('productivity.title')}</Label>
                  <Input
                    id="title"
                    value={newTodo.title}
                    onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                    placeholder={t('productivity.enterTitle')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">{t('productivity.description')}</Label>
                  <Textarea
                    id="description"
                    value={newTodo.description}
                    onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                    placeholder={t('productivity.enterDescription')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">{t('productivity.priority.label')}</Label>
                    <Select value={newTodo.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setNewTodo({ ...newTodo, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('productivity.priority.low')}</SelectItem>
                        <SelectItem value="medium">{t('productivity.priority.medium')}</SelectItem>
                        <SelectItem value="high">{t('productivity.priority.high')}</SelectItem>
                        <SelectItem value="urgent">{t('productivity.priority.urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="due_date">{t('productivity.dueDate')}</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={newTodo.due_date}
                      onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
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

      {/* View Content */}
      {viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="space-y-3">
          {filteredTodos
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
            .map((todo) => (
            <Card key={todo.id} className={cn(
              "transition-all hover:shadow-lg border-l-4",
              todo.status === 'completed' ? 'opacity-75 bg-muted/30' : 'hover:border-primary/20 shadow-sm',
              todo.priority === 'urgent' ? 'border-l-red-500' :
              todo.priority === 'high' ? 'border-l-orange-500' :
              todo.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={todo.status === 'completed'}
                      onCheckedChange={() => toggleTodoStatus(todo.id)}
                      className="mt-1 h-5 w-5"
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={cn("w-2 h-2 rounded-full", getPriorityDot(todo.priority))} />
                        <h3 className={cn(
                          "font-semibold text-base",
                          todo.status === 'completed' && 'line-through text-muted-foreground'
                        )}>
                          {todo.title}
                        </h3>
                        <Badge variant={getPriorityColor(todo.priority)} className="font-medium">
                          {t(`productivity.priority.${todo.priority}`)}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(todo.status)}
                          <span className="text-sm text-muted-foreground">
                            {t(`productivity.status.${todo.status === 'in_progress' ? 'inProgress' : todo.status}`)}
                          </span>
                        </div>
                      </div>

                      {todo.description && (
                        <p className="text-sm text-muted-foreground">
                          {todo.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {todo.due_date && (
                          <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                            <Calendar className="h-3 w-3" />
                            <span className="font-medium">
                              {format(new Date(todo.due_date), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                        )}
                        {todo.category && todo.category !== 'general' && (
                          <Badge variant="outline" className="text-xs">
                            #{todo.category}
                          </Badge>
                        )}
                        {todo.order_id && !isOrderFiltered && (
                          <OrderLinkInline orderId={todo.order_id} />
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingTodo(todo)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteTodo(todo.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredTodos.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('productivity.noTodosFound')}</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? t('productivity.noTodosWithFilters')
                    : t('productivity.createFirstTodo')
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('productivity.createTodo')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kanbanColumns.map(column => {
            const columnTodos = filteredTodos.filter(todo => todo.status === column.status);

            return (
              <div key={column.status} className="flex flex-col h-full">
                {/* Column Header */}
                <div className={cn(
                  "rounded-t-lg p-3 border-b-2",
                  column.color
                )}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{column.title}</h3>
                    <Badge variant="secondary" className="font-bold">
                      {columnTodos.length}
                    </Badge>
                  </div>
                </div>

                {/* Column Content */}
                <div className="flex-1 p-3 space-y-3 bg-muted/20 rounded-b-lg overflow-y-auto min-h-[400px]">
                  {columnTodos
                    .sort((a, b) => {
                      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
                      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
                      return aPriority - bPriority;
                    })
                    .map(todo => (
                      <Card
                        key={todo.id}
                        className={cn(
                          "transition-all hover:shadow-md cursor-pointer border-l-4",
                          todo.priority === 'urgent' ? 'border-l-red-500' :
                          todo.priority === 'high' ? 'border-l-orange-500' :
                          todo.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
                        )}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              <Checkbox
                                checked={todo.status === 'completed'}
                                onCheckedChange={() => toggleTodoStatus(todo.id)}
                                className="mt-1"
                              />
                              <h4 className={cn(
                                "font-medium text-sm",
                                todo.status === 'completed' && 'line-through text-muted-foreground'
                              )}>
                                {todo.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1">
                              <div className={cn("w-2 h-2 rounded-full", getPriorityDot(todo.priority))} />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingTodo(todo)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t('common.edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => deleteTodo(todo.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('common.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {todo.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {todo.description}
                            </p>
                          )}

                          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                            {todo.due_date && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{format(new Date(todo.due_date), 'MMM dd, HH:mm')}</span>
                              </div>
                            )}
                            {todo.order_id && !isOrderFiltered && (
                              <OrderLinkInline orderId={todo.order_id} />
                            )}
                            {todo.category && todo.category !== 'general' && (
                              <Badge variant="outline" className="text-xs w-fit">
                                #{todo.category}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                  {columnTodos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <div className="text-3xl mb-2">📭</div>
                      <p className="text-xs">{t('productivity.noTasks')}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Todo Dialog */}
      <Dialog open={!!editingTodo} onOpenChange={() => setEditingTodo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('productivity.editTodo')}</DialogTitle>
          </DialogHeader>
          {editingTodo && (
            <form onSubmit={handleUpdateTodo} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">{t('productivity.title')}</Label>
                <Input
                  id="edit-title"
                  value={editingTodo.title}
                  onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-description">{t('productivity.description')}</Label>
                <Textarea
                  id="edit-description"
                  value={editingTodo.description || ""}
                  onChange={(e) => setEditingTodo({ ...editingTodo, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-priority">{t('productivity.priority.label')}</Label>
                  <Select value={editingTodo.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setEditingTodo({ ...editingTodo, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('productivity.priority.low')}</SelectItem>
                      <SelectItem value="medium">{t('productivity.priority.medium')}</SelectItem>
                      <SelectItem value="high">{t('productivity.priority.high')}</SelectItem>
                      <SelectItem value="urgent">{t('productivity.priority.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-status">{t('productivity.status.label')}</Label>
                  <Select value={editingTodo.status} onValueChange={(value) => setEditingTodo({ ...editingTodo, status: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('productivity.status.pending')}</SelectItem>
                      <SelectItem value="in_progress">{t('productivity.status.inProgress')}</SelectItem>
                      <SelectItem value="completed">{t('productivity.status.completed')}</SelectItem>
                      <SelectItem value="cancelled">{t('productivity.status.cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-due-date">{t('productivity.dueDate')}</Label>
                <Input
                  id="edit-due-date"
                  type="datetime-local"
                  value={editingTodo.due_date ? new Date(editingTodo.due_date).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditingTodo({ ...editingTodo, due_date: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingTodo(null)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {t('common.save')}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
