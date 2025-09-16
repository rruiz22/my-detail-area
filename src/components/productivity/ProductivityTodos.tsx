import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Car,
  User2,
  ExternalLink,
  X
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProductivityTodos, ProductivityTodo } from "@/hooks/useProductivityTodos";
import { useOrderContext } from "@/hooks/useOrderContext";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useSearchParams } from "react-router-dom";

export const ProductivityTodos = () => {
  const { t } = useTranslation();
  const { todos, loading, createTodo, updateTodo, deleteTodo, toggleTodoStatus } = useProductivityTodos();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<ProductivityTodo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Order filter from URL params
  const orderFilter = searchParams.get('order') || '';
  const orderTodos = orderFilter ? todos.filter(todo => todo.order_id === orderFilter) : [];
  const isOrderFiltered = !!orderFilter;

  // Get order context for enriched display
  const { orderData, loading: orderLoading } = useOrderContext(orderFilter || null);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-3 bg-muted rounded w-1/4"></div>
            </CardHeader>
            <CardContent>
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
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Car className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Tasks for Order #{orderData?.customOrderNumber || orderFilter}
                    </p>
                    {orderData && (
                      <div className="text-xs text-blue-700 space-y-1">
                        <p>Customer: <strong>{orderData.customerName}</strong></p>
                        {orderData.vehicleMake && orderData.vehicleModel && (
                          <p>Vehicle: <strong>{orderData.vehicleYear} {orderData.vehicleMake} {orderData.vehicleModel}</strong></p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-blue-600 mt-1">
                      {filteredTodos.length} task{filteredTodos.length !== 1 ? 's' : ''} •
                      {filteredTodos.filter(t => t.status === 'completed').length} completed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/orders`}>
                    <Button variant="outline" size="sm" className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-100">
                      <ExternalLink className="w-4 h-4" />
                      View Order
                    </Button>
                  </Link>
                </div>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('productivity.searchTodos')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
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
              <SelectValue placeholder="Priority" />
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

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('productivity.createTodo')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isOrderFiltered
                  ? `Create Task for Order #${orderFilter}`
                  : t('productivity.createTodo')
                }
              </DialogTitle>
              <DialogDescription>
                {isOrderFiltered
                  ? `This task will be linked to Order #${orderFilter}`
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
                  <Select value={newTodo.priority} onValueChange={(value) => setNewTodo({ ...newTodo, priority: value as any })}>
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

      {/* Todos List */}
      <div className="space-y-4">
        {filteredTodos.map((todo) => (
          <Card key={todo.id} className={`transition-all hover:shadow-md ${
            todo.status === 'completed' ? 'opacity-75' : ''
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={todo.status === 'completed'}
                    onCheckedChange={() => toggleTodoStatus(todo.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${
                        todo.status === 'completed' ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {todo.title}
                      </h3>
                      <Badge variant={getPriorityColor(todo.priority)}>
                        {t(`productivity.priority.${todo.priority}`)}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(todo.status)}
                        <span className="text-sm text-muted-foreground">
                          {t(`productivity.status.${todo.status}`)}
                        </span>
                      </div>
                    </div>
                    
                    {todo.description && (
                      <p className="text-sm text-muted-foreground">
                        {todo.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {todo.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(todo.due_date), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                      <span>#{todo.category}</span>
                      {todo.order_id && !isOrderFiltered && (
                        <div className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          <Link
                            to={`/productivity?order=${todo.order_id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Order #{todo.order_id}
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
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
                  <Select value={editingTodo.priority} onValueChange={(value) => setEditingTodo({ ...editingTodo, priority: value as any })}>
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