import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Edit2, 
  Save, 
  X, 
  Lock, 
  Eye,
  History,
  User
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface InstructionsBlockProps {
  order: any;
  onNotesUpdate?: (orderId: string, notes: string, type: 'general' | 'internal') => void;
}

export function InstructionsBlock({ order, onNotesUpdate }: InstructionsBlockProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [editingInternal, setEditingInternal] = useState(false);
  const [generalNotes, setGeneralNotes] = useState(order?.notes || '');
  const [internalNotes, setInternalNotes] = useState(order?.internal_notes || '');

  const canEditInternal = user?.role === 'detail_user' || user?.role === 'admin';

  const handleSaveGeneral = async () => {
    if (onNotesUpdate) {
      await onNotesUpdate(order.id, generalNotes, 'general');
    }
    setEditingGeneral(false);
  };

  const handleSaveInternal = async () => {
    if (onNotesUpdate) {
      await onNotesUpdate(order.id, internalNotes, 'internal');
    }
    setEditingInternal(false);
  };

  const handleCancelGeneral = () => {
    setGeneralNotes(order?.notes || '');
    setEditingGeneral(false);
  };

  const handleCancelInternal = () => {
    setInternalNotes(order?.internal_notes || '');
    setEditingInternal(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Instructions & Notes
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* General Instructions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">{t('orders.general_notes')}</h4>
              <Badge variant="outline" className="text-xs">Public</Badge>
            </div>
            {!editingGeneral && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingGeneral(true)}
                className="h-8"
              >
                <Edit2 className="h-3 w-3 mr-2" />
                Edit
              </Button>
            )}
          </div>

          {editingGeneral ? (
            <div className="space-y-3">
              <Textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder={t('orders.notesPlaceholder')}
                className="min-h-[100px] resize-none"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveGeneral}
                  className="h-8"
                >
                  <Save className="h-3 w-3 mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelGeneral}
                  className="h-8"
                >
                  <X className="h-3 w-3 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted/20 rounded-lg border border-dashed min-h-[80px]">
              {generalNotes ? (
                <p className="text-sm whitespace-pre-wrap">{generalNotes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {t('orders.no_notes')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Internal Instructions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">{t('orders.internal_notes')}</h4>
              <Badge variant="secondary" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                Detail Users Only
              </Badge>
            </div>
            {canEditInternal && !editingInternal && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingInternal(true)}
                className="h-8"
              >
                <Edit2 className="h-3 w-3 mr-2" />
                Edit
              </Button>
            )}
          </div>

          {canEditInternal ? (
            editingInternal ? (
              <div className="space-y-3">
                <Textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Internal notes for detail team..."
                  className="min-h-[100px] resize-none"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveInternal}
                    className="h-8"
                  >
                    <Save className="h-3 w-3 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelInternal}
                    className="h-8"
                  >
                    <X className="h-3 w-3 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg border border-solid min-h-[80px]">
                {internalNotes ? (
                  <p className="text-sm whitespace-pre-wrap">{internalNotes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t('orders.no_internal_notes')}
                  </p>
                )}
              </div>
            )
          ) : (
            <div className="p-4 bg-muted/10 rounded-lg border border-dashed min-h-[60px] flex items-center justify-center">
              <div className="text-center">
                <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Restricted to detail users
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions Summary */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Instructions Summary</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-muted/20 rounded-lg">
              <p className="text-lg font-bold text-primary">
                {generalNotes ? generalNotes.split(' ').length : 0}
              </p>
              <p className="text-xs text-muted-foreground">Words in general notes</p>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg">
              <p className="text-lg font-bold text-secondary">
                {internalNotes ? internalNotes.split(' ').length : 0}
              </p>
              <p className="text-xs text-muted-foreground">Words in internal notes</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}