import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
    useCreateVehicleNote,
    useDeleteVehicleNote,
    useTogglePinNote,
    useUpdateVehicleNote,
    useVehicleNotes,
    type VehicleNote,
} from '@/hooks/useVehicleNotes';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Edit,
    Eye,
    Loader2,
    MessageSquare,
    MoreVertical,
    Pin,
    PinOff,
    Plus,
    Search,
    Trash2,
    Wrench,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NoteReplies } from '../NoteReplies';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { MarkdownEditor } from '../MarkdownEditor';
import { useWorkItems } from '@/hooks/useVehicleWorkItems';

interface VehicleNotesTabProps {
  vehicleId: string;
  className?: string;
}

export function VehicleNotesTab({ vehicleId, className }: VehicleNotesTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Fetch notes and work items
  const { data: notes = [], isLoading } = useVehicleNotes(vehicleId);
  const { data: workItems = [] } = useWorkItems(vehicleId);

  // Real-time subscription for notes
  useRealtimeSubscription({
    table: 'vehicle_notes',
    filter: 'vehicle_id',
    filterValue: vehicleId,
    queryKeysToInvalidate: [
      ['vehicle-notes', vehicleId],
      ['vehicle-activity-log'],
    ],
    enabled: !!vehicleId,
  });

  // Real-time subscription for note replies
  useRealtimeSubscription({
    table: 'vehicle_note_replies',
    queryKeysToInvalidate: [
      ['note-replies'],
      ['vehicle-notes', vehicleId],
      ['vehicle-activity-log'],
    ],
    enabled: !!vehicleId,
  });

  // Mutations
  const createNote = useCreateVehicleNote();
  const updateNote = useUpdateVehicleNote();
  const deleteNote = useDeleteVehicleNote();
  const togglePin = useTogglePinNote();

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<VehicleNote | null>(null);

  // Form states
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<VehicleNote['note_type']>('general');
  const [newNoteWorkItem, setNewNoteWorkItem] = useState<string>('');
  const [editNoteContent, setEditNoteContent] = useState('');
  const [editNoteType, setEditNoteType] = useState<VehicleNote['note_type']>('general');
  const [editNoteWorkItem, setEditNoteWorkItem] = useState<string>('');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Handle create note
  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) {
      toast({
        title: t('get_ready.notes.error'),
        description: t('get_ready.notes.content_required'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await createNote.mutateAsync({
        vehicle_id: vehicleId,
        content: newNoteContent.trim(),
        note_type: newNoteType,
        is_pinned: false,
        linked_work_item_id: newNoteWorkItem || undefined,
      });

      toast({
        title: t('get_ready.notes.created'),
        description: t('get_ready.notes.created_success'),
      });

      setNewNoteContent('');
      setNewNoteType('general');
      setNewNoteWorkItem('');
      setCreateModalOpen(false);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('get_ready.notes.create_error'),
        variant: 'destructive',
      });
    }
  };

  // Handle edit note
  const handleEditNote = async () => {
    if (!selectedNote || !editNoteContent.trim()) return;

    try {
      await updateNote.mutateAsync({
        noteId: selectedNote.id,
        vehicleId,
        updates: {
          content: editNoteContent.trim(),
          note_type: editNoteType,
          linked_work_item_id: editNoteWorkItem || undefined,
        },
      });

      toast({
        title: t('get_ready.notes.updated'),
        description: t('get_ready.notes.updated_success'),
      });

      setEditModalOpen(false);
      setSelectedNote(null);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('get_ready.notes.update_error'),
        variant: 'destructive',
      });
    }
  };

  // Handle delete note
  const handleDeleteNote = async () => {
    if (!selectedNote) return;

    try {
      await deleteNote.mutateAsync({
        noteId: selectedNote.id,
        vehicleId,
      });

      toast({
        title: t('get_ready.notes.deleted'),
        description: t('get_ready.notes.deleted_success'),
      });

      setDeleteModalOpen(false);
      setSelectedNote(null);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('get_ready.notes.delete_error'),
        variant: 'destructive',
      });
    }
  };

  // Handle toggle pin
  const handleTogglePin = async (note: VehicleNote) => {
    try {
      await togglePin.mutateAsync({
        noteId: note.id,
        vehicleId,
        isPinned: !note.is_pinned,
      });

      toast({
        title: note.is_pinned ? t('get_ready.notes.unpinned') : t('get_ready.notes.pinned'),
        description: note.is_pinned
          ? t('get_ready.notes.unpinned_success')
          : t('get_ready.notes.pinned_success'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('get_ready.notes.pin_error'),
        variant: 'destructive',
      });
    }
  };

  // Open edit modal
  const openEditModal = (note: VehicleNote) => {
    setSelectedNote(note);
    setEditNoteContent(note.content);
    setEditNoteType(note.note_type);
    setEditNoteWorkItem(note.linked_work_item_id || '');
    setEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (note: VehicleNote) => {
    setSelectedNote(note);
    setDeleteModalOpen(true);
  };

  // Get note type icon and color
  const getNoteTypeConfig = (type: VehicleNote['note_type']) => {
    switch (type) {
      case 'issue':
        return {
          icon: AlertCircle,
          color: 'text-red-600 bg-red-50 border-red-200',
          label: t('get_ready.notes.types.issue'),
        };
      case 'important':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          label: t('get_ready.notes.types.important'),
        };
      case 'observation':
        return {
          icon: Eye,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          label: t('get_ready.notes.types.observation'),
        };
      case 'reminder':
        return {
          icon: CheckCircle,
          color: 'text-purple-600 bg-purple-50 border-purple-200',
          label: t('get_ready.notes.types.reminder'),
        };
      default:
        return {
          icon: MessageSquare,
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          label: t('get_ready.notes.types.general'),
        };
    }
  };

  // Helper to get work item title
  const getWorkItemTitle = (workItemId: string | undefined) => {
    if (!workItemId) return null;
    const item = workItems.find(wi => wi.id === workItemId);
    return item?.title || null;
  };

  // Filter notes by search term and type
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchTerm === '' ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || note.note_type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Add Button */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{t('get_ready.tabs.notes')}</h3>
            <p className="text-sm text-muted-foreground">
              {filteredNotes.length === 0
                ? t('get_ready.notes.no_notes')
                : t('get_ready.notes.notes_count', { count: filteredNotes.length })}
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('get_ready.notes.add_note')}
          </Button>
        </div>

        {/* Search and Filters */}
        {notes.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('get_ready.notes.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('get_ready.notes.all_types')}</SelectItem>
                <SelectItem value="general">{t('get_ready.notes.types.general')}</SelectItem>
                <SelectItem value="issue">{t('get_ready.notes.types.issue')}</SelectItem>
                <SelectItem value="observation">{t('get_ready.notes.types.observation')}</SelectItem>
                <SelectItem value="reminder">{t('get_ready.notes.types.reminder')}</SelectItem>
                <SelectItem value="important">{t('get_ready.notes.types.important')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              {t('get_ready.notes.empty_state')}
            </p>
            <Button onClick={() => setCreateModalOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              {t('get_ready.notes.add_first_note')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const typeConfig = getNoteTypeConfig(note.note_type);
            const NoteIcon = typeConfig.icon;

            return (
              <Card
                key={note.id}
                className={cn(
                  'transition-all hover:shadow-md',
                  note.is_pinned && 'border-primary border-2'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn('p-2 rounded-lg flex-shrink-0', typeConfig.color)}>
                      <NoteIcon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {note.is_pinned && (
                            <Badge variant="secondary" className="gap-1">
                              <Pin className="h-3 w-3" />
                              {t('get_ready.notes.pinned')}
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn('text-xs', typeConfig.color)}>
                            {typeConfig.label}
                          </Badge>
                          {note.linked_work_item_id && getWorkItemTitle(note.linked_work_item_id) && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                              <Wrench className="h-3 w-3 mr-1" />
                              {getWorkItemTitle(note.linked_work_item_id)}
                            </Badge>
                          )}
                        </div>

                        {/* Actions Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTogglePin(note)}>
                              {note.is_pinned ? (
                                <>
                                  <PinOff className="h-4 w-4 mr-2" />
                                  {t('get_ready.notes.unpin')}
                                </>
                              ) : (
                                <>
                                  <Pin className="h-4 w-4 mr-2" />
                                  {t('get_ready.notes.pin')}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(note)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteModal(note)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Note Content - Rendered as Markdown */}
                      <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none mb-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {note.content}
                        </ReactMarkdown>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">
                          {note.created_by_profile
                            ? `${note.created_by_profile.first_name || ''} ${note.created_by_profile.last_name || ''}`.trim() || note.created_by_profile.email
                            : 'Unknown'}
                        </span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </span>
                        {note.updated_at !== note.created_at && (
                          <>
                            <span>•</span>
                            <span className="italic">{t('get_ready.notes.edited')}</span>
                          </>
                        )}
                      </div>

                      {/* Replies Section */}
                      <NoteReplies noteId={note.id} className="mt-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Note Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('get_ready.notes.add_note')}</DialogTitle>
            <DialogDescription>{t('get_ready.notes.add_note_description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note-type">{t('get_ready.notes.note_type')}</Label>
              <Select value={newNoteType} onValueChange={(value: any) => setNewNoteType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t('get_ready.notes.types.general')}</SelectItem>
                  <SelectItem value="issue">{t('get_ready.notes.types.issue')}</SelectItem>
                  <SelectItem value="observation">{t('get_ready.notes.types.observation')}</SelectItem>
                  <SelectItem value="reminder">{t('get_ready.notes.types.reminder')}</SelectItem>
                  <SelectItem value="important">{t('get_ready.notes.types.important')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note-content">{t('get_ready.notes.content')}</Label>
              <MarkdownEditor
                value={newNoteContent}
                onChange={setNewNoteContent}
                placeholder={t('get_ready.notes.content_placeholder')}
                rows={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note-work-item">{t('get_ready.notes.link_to_work_item')} ({t('common.optional')})</Label>
              <Select value={newNoteWorkItem || 'none'} onValueChange={(val) => setNewNoteWorkItem(val === 'none' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('get_ready.notes.select_work_item')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('get_ready.notes.no_work_item')}</SelectItem>
                  {workItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateNote} disabled={createNote.isPending}>
              {createNote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('get_ready.notes.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('get_ready.notes.edit_note')}</DialogTitle>
            <DialogDescription>{t('get_ready.notes.edit_note_description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-note-type">{t('get_ready.notes.note_type')}</Label>
              <Select value={editNoteType} onValueChange={(value: any) => setEditNoteType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t('get_ready.notes.types.general')}</SelectItem>
                  <SelectItem value="issue">{t('get_ready.notes.types.issue')}</SelectItem>
                  <SelectItem value="observation">{t('get_ready.notes.types.observation')}</SelectItem>
                  <SelectItem value="reminder">{t('get_ready.notes.types.reminder')}</SelectItem>
                  <SelectItem value="important">{t('get_ready.notes.types.important')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-note-content">{t('get_ready.notes.content')}</Label>
              <MarkdownEditor
                value={editNoteContent}
                onChange={setEditNoteContent}
                rows={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-work-item">{t('get_ready.notes.link_to_work_item')}</Label>
              <Select value={editNoteWorkItem || 'none'} onValueChange={(val) => setEditNoteWorkItem(val === 'none' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('get_ready.notes.select_work_item')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('get_ready.notes.no_work_item')}</SelectItem>
                  {workItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEditNote} disabled={updateNote.isPending}>
              {updateNote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('get_ready.notes.delete_note')}</DialogTitle>
            <DialogDescription>{t('get_ready.notes.delete_note_confirmation')}</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteNote} disabled={deleteNote.isPending}>
              {deleteNote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
