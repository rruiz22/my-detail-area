import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Send, 
  Paperclip, 
  Shield,
  AtSign,
  Clock,
  Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface InternalNote {
  id: string;
  message: string;
  user_name: string;
  created_at: string;
  user_id: string;
  mentions?: string[];
}

interface InternalNotesBlockProps {
  orderId: string;
}

export function InternalNotesBlock({ orderId }: InternalNotesBlockProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user can access internal notes
  const canAccessInternal = user?.role === 'detail_user' || user?.role === 'admin' || 
                           user?.role === 'dealer_admin' || user?.role === 'dealer_manager';

  useEffect(() => {
    if (canAccessInternal) {
      fetchInternalNotes();
    }
  }, [orderId, canAccessInternal]);

  const fetchInternalNotes = async () => {
    try {
      // Mock internal notes data (replace with actual database query when schema is ready)
      const mockNotes: InternalNote[] = [
        {
          id: '1',
          message: 'Customer has premium detail package. Use high-end products only.',
          user_name: 'Detail Supervisor',
          created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          user_id: 'detail1'
        },
        {
          id: '2',
          message: 'Check for paint damage on rear bumper before starting work',
          user_name: 'Quality Control',
          created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          user_id: 'qc1'
        }
      ];
      
      setNotes(mockNotes);
      
      // TODO: Replace with actual database query once order_comments table is created
      // const { data, error } = await supabase
      //   .from('order_comments')
      //   .select('*')
      //   .eq('order_id', orderId)
      //   .eq('is_internal', true)
      //   .order('created_at', { ascending: true });
      
    } catch (error) {
      console.error('Error fetching internal notes:', error);
    }
  };

  const addInternalNote = async () => {
    if (!newNote.trim() || !user || !canAccessInternal) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_comments')
        .insert({
          order_id: orderId,
          user_id: user.id,
          comment_text: newNote.trim(),
          comment_type: 'internal'
        })
        .select()
        .single();

      if (error) throw error;

      const meta: any = (user as any)?.user_metadata || {};
      const displayName = meta.first_name && meta.last_name
        ? `${meta.first_name} ${meta.last_name}`
        : (user.email?.split('@')[0] || 'User');

      const addedNote: InternalNote = {
        id: data.id,
        message: data.comment_text,
        user_name: displayName,
        created_at: data.created_at,
        user_id: data.user_id
      };

      setNotes(prev => [...prev, addedNote]);
      setNewNote('');
      toast.success('Internal note added');
    } catch (error) {
      console.error('Error adding internal note:', error);
      toast.error('Failed to add internal note');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addInternalNote();
    }
  };

  if (!canAccessInternal) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h4 className="font-medium mb-1">Internal Notes</h4>
          <p className="text-sm text-muted-foreground">
            Detail team access required
          </p>
          <Badge variant="secondary" className="mt-2">
            <Shield className="h-3 w-3 mr-1" />
            Restricted Access
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-amber-600" />
          Internal Notes
          <Badge variant="secondary" className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Detail Team Only
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Internal Note Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add internal note... @mention detail team"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border-amber-300"
            />
            <Button
              onClick={addInternalNote}
              disabled={loading || !newNote.trim()}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs border-amber-300">
              <Paperclip className="h-3 w-3 mr-1" />
              Internal Files
            </Button>
            <Button variant="outline" size="sm" className="text-xs border-amber-300">
              <AtSign className="h-3 w-3 mr-1" />
              Mention Team
            </Button>
          </div>
        </div>

        {/* Internal Notes Thread */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No internal notes yet</p>
              <p className="text-xs">Add private notes for the detail team</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-amber-100/50 p-3 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-amber-200 text-amber-800">
                      {note.user_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-amber-800">{note.user_name}</span>
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                    Detail Team
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(note.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap text-amber-900">{note.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Internal Notes Summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-amber-200">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{notes.length} internal notes</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>Confidential</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}