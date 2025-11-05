import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Pin,
  Edit,
  Trash2,
  MoreVertical,
  Tag,
  X,
  StickyNote,
  PinOff,
  Hash
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProductivityNotes, ProductivityNote, CreateNoteData } from "@/hooks/useProductivityNotes";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Color configurations for sticky notes
const NOTE_COLORS = {
  yellow: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
    header: 'bg-yellow-200',
    text: 'text-yellow-900',
    hover: 'hover:bg-yellow-50',
  },
  blue: {
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    header: 'bg-blue-200',
    text: 'text-blue-900',
    hover: 'hover:bg-blue-50',
  },
  green: {
    bg: 'bg-green-100',
    border: 'border-green-300',
    header: 'bg-green-200',
    text: 'text-green-900',
    hover: 'hover:bg-green-50',
  },
  pink: {
    bg: 'bg-pink-100',
    border: 'border-pink-300',
    header: 'bg-pink-200',
    text: 'text-pink-900',
    hover: 'hover:bg-pink-50',
  },
  purple: {
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    header: 'bg-purple-200',
    text: 'text-purple-900',
    hover: 'hover:bg-purple-50',
  },
  orange: {
    bg: 'bg-orange-100',
    border: 'border-orange-300',
    header: 'bg-orange-200',
    text: 'text-orange-900',
    hover: 'hover:bg-orange-50',
  },
};

const COLOR_OPTIONS: Array<keyof typeof NOTE_COLORS> = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'];

interface NoteCardProps {
  note: ProductivityNote;
  onEdit: (note: ProductivityNote) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
}

const NoteCard = ({ note, onEdit, onDelete, onTogglePin }: NoteCardProps) => {
  const colors = NOTE_COLORS[note.color];

  return (
    <Card
      className={cn(
        "relative transition-all hover:shadow-xl cursor-pointer border-2 transform hover:scale-105",
        colors.bg,
        colors.border,
        "group"
      )}
      style={{
        minHeight: '200px',
        boxShadow: '4px 4px 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* Pin indicator */}
      {note.is_pinned && (
        <div className="absolute -top-2 -right-2 z-10">
          <Pin className="h-5 w-5 text-red-500 fill-red-500 transform rotate-45" />
        </div>
      )}

      {/* Header */}
      <CardHeader className={cn("p-3 rounded-t-lg", colors.header)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {note.title && (
              <h3 className={cn("font-bold text-sm truncate", colors.text)}>
                {note.title}
              </h3>
            )}
            <p className="text-xs text-muted-foreground">
              {format(new Date(note.updated_at), 'MMM dd, HH:mm')}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTogglePin(note.id, note.is_pinned)}>
                {note.is_pinned ? (
                  <>
                    <PinOff className="h-4 w-4 mr-2" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4 mr-2" />
                    Pin to top
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(note)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(note.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="p-3 space-y-2">
        <p className={cn("text-sm whitespace-pre-wrap", colors.text)} style={{ minHeight: '80px' }}>
          {note.content}
        </p>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-current/20">
            {note.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className={cn("text-xs", colors.text)}
              >
                <Hash className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface NoteFormProps {
  note?: ProductivityNote | null;
  onSubmit: (data: CreateNoteData) => void;
  onClose: () => void;
}

const NoteForm = ({ note, onSubmit, onClose }: NoteFormProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateNoteData>({
    title: note?.title || '',
    content: note?.content || '',
    color: note?.color || 'yellow',
    is_pinned: note?.is_pinned || false,
    tags: note?.tags || [],
  });
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(tag => tag !== tagToRemove) || [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title (optional)</Label>
        <Input
          id="title"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter note title..."
        />
      </div>

      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Write your note here..."
          required
          rows={6}
        />
      </div>

      <div>
        <Label>Color</Label>
        <div className="flex gap-2 flex-wrap mt-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={cn(
                "w-10 h-10 rounded-full border-4 transition-all",
                NOTE_COLORS[color].bg,
                formData.color === color ? 'border-gray-900 scale-110' : 'border-gray-300 hover:scale-105'
              )}
              title={color}
            />
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        <div className="flex gap-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add tag..."
          />
          <Button type="button" onClick={addTag} variant="outline" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {formData.tags && formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                <Hash className="h-3 w-3" />
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_pinned"
          checked={formData.is_pinned}
          onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="is_pinned" className="cursor-pointer">
          Pin this note to the top
        </Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          {note ? 'Update Note' : 'Create Note'}
        </Button>
      </div>
    </form>
  );
};

export const ProductivityQuickNotes = () => {
  const { t } = useTranslation();
  const { notes, loading, createNote, updateNote, togglePin, deleteNote } = useProductivityNotes();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ProductivityNote | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchTerm === '' ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTag = !selectedTag || note.tags?.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags || [])));

  const handleCreateNote = async (data: CreateNoteData) => {
    await createNote(data);
  };

  const handleUpdateNote = async (data: CreateNoteData) => {
    if (editingNote) {
      await updateNote(editingNote.id, data);
      setEditingNote(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse min-h-[200px]">
            <CardHeader className="bg-muted">
              <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-3 bg-muted-foreground/20 rounded"></div>
                <div className="h-3 bg-muted-foreground/20 rounded w-5/6"></div>
                <div className="h-3 bg-muted-foreground/20 rounded w-4/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-2 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Quick Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Quick Note</DialogTitle>
              <DialogDescription>
                Create a personal quick note for reminders, ideas, or tasks
              </DialogDescription>
            </DialogHeader>
            <NoteForm
              onSubmit={handleCreateNote}
              onClose={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tags Filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={selectedTag === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTag(null)}
          >
            All
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              <Hash className="h-3 w-3 mr-1" />
              {tag}
            </Button>
          ))}
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onEdit={setEditingNote}
            onDelete={deleteNote}
            onTogglePin={togglePin}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <StickyNote className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm || selectedTag ? 'No notes found' : 'No quick notes yet'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || selectedTag
                ? 'Try adjusting your search or filter'
                : 'Create your first quick note to get started!'}
            </p>
            {!searchTerm && !selectedTag && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Quick Note
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Quick Note</DialogTitle>
            <DialogDescription>
              Update your note content, color, or tags
            </DialogDescription>
          </DialogHeader>
          {editingNote && (
            <NoteForm
              note={editingNote}
              onSubmit={handleUpdateNote}
              onClose={() => setEditingNote(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
