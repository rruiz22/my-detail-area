import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    useAllAnnouncements,
    useCreateAnnouncement,
    useDeleteAnnouncement,
    useToggleAnnouncementStatus,
    useUpdateAnnouncement,
    type Announcement,
    type AnnouncementFormData,
} from '@/hooks/useAnnouncements';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { AlertCircle, Edit, Eye, EyeOff, Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ROLE_OPTIONS = [
  { value: 'system_admin', label: 'System Admin' },
  { value: 'dealer_admin', label: 'Dealer Admin' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'service_manager', label: 'Service Manager' },
  { value: 'detailer', label: 'Detailer' },
  { value: 'technician', label: 'Technician' },
];

export default function Announcements() {
  const { t } = useTranslation();
  const { data: announcements = [], isLoading } = useAllAnnouncements();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const toggleMutation = useToggleAnnouncementStatus();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    content: '',
    type: 'info',
    priority: 0,
    is_active: true,
    start_date: null,
    end_date: null,
    target_roles: null,
    target_dealer_ids: null,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      priority: 0,
      is_active: true,
      start_date: null,
      end_date: null,
      target_roles: null,
      target_dealer_ids: null,
    });
    setEditingAnnouncement(null);
    setShowPreview(false);
  };

  const handleOpenDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        priority: announcement.priority,
        is_active: announcement.is_active,
        start_date: announcement.start_date,
        end_date: announcement.end_date,
        target_roles: announcement.target_roles,
        target_dealer_ids: announcement.target_dealer_ids,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAnnouncement) {
        await updateMutation.mutateAsync({
          id: editingAnnouncement.id,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving announcement:', error);
    }
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteMutation.mutateAsync(deletingId);
        setIsDeleteDialogOpen(false);
        setDeletingId(null);
      } catch (error) {
        console.error('Error deleting announcement:', error);
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id, is_active: !currentStatus });
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'alert':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const sanitizedPreview = DOMPurify.sanitize(formData.content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('announcements.title', 'Announcements')}</h1>
          <p className="text-muted-foreground">
            {t('announcements.description', 'Manage global announcements and alerts for users')}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('announcements.create', 'Create Announcement')}
        </Button>
      </div>

      <div className="grid gap-4">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t('announcements.no_announcements', 'No announcements yet. Create your first one!')}
              </p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{announcement.title}</CardTitle>
                      <Badge className={getTypeColor(announcement.type)}>
                        {announcement.type}
                      </Badge>
                      {!announcement.is_active && (
                        <Badge variant="outline">
                          {t('announcements.inactive', 'Inactive')}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {t('announcements.priority', 'Priority')}: {announcement.priority} |{' '}
                      {announcement.start_date &&
                        t('announcements.starts', 'Starts') +
                          ': ' +
                          format(new Date(announcement.start_date), 'MMM dd, yyyy')}{' '}
                      {announcement.end_date &&
                        '| ' +
                        t('announcements.ends', 'Ends') +
                        ': ' +
                        format(new Date(announcement.end_date), 'MMM dd, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(announcement.id, announcement.is_active)}
                    >
                      {announcement.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeletingId(announcement.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(announcement.content, {
                      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div'],
                      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
                    }),
                  }}
                />
                {announcement.target_roles && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('announcements.target_roles', 'Target Roles')}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {announcement.target_roles.map((role) => (
                        <Badge key={role} variant="outline">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement
                ? t('announcements.edit', 'Edit Announcement')
                : t('announcements.create', 'Create Announcement')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'announcements.form_description',
                'Create announcements to notify users about important updates, alerts, or information.'
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('announcements.title_label', 'Title')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder={t('announcements.title_placeholder', 'Enter announcement title')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">{t('announcements.content_label', 'Content (HTML supported)')}</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={6}
                placeholder={t(
                  'announcements.content_placeholder',
                  'Enter content. You can use HTML tags like <b>, <i>, <a>, <ul>, etc.'
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? t('announcements.hide_preview', 'Hide Preview') : t('announcements.show_preview', 'Show Preview')}
              </Button>
              {showPreview && (
                <div className="mt-2 p-4 border rounded-md bg-muted">
                  <p className="text-sm font-medium mb-2">{t('announcements.preview', 'Preview')}:</p>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t('announcements.type_label', 'Type')}</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">{t('announcements.type_info', 'Info')}</SelectItem>
                    <SelectItem value="warning">{t('announcements.type_warning', 'Warning')}</SelectItem>
                    <SelectItem value="alert">{t('announcements.type_alert', 'Alert')}</SelectItem>
                    <SelectItem value="success">{t('announcements.type_success', 'Success')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">{t('announcements.priority_label', 'Priority')}</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">{t('announcements.start_date', 'Start Date')}</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">{t('announcements.end_date', 'End Date (Optional)')}</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">{t('announcements.is_active', 'Active')}</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingAnnouncement
                  ? t('common.save', 'Save')
                  : t('common.create', 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('announcements.delete_title', 'Delete Announcement')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'announcements.delete_description',
                'Are you sure you want to delete this announcement? This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
