import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Radio,
  Car,
  MapPin,
  Edit,
  Trash2,
  Search,
  Filter,
  QrCode,
  Settings,
  Activity,
  Smartphone,
  Eye,
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { NFCTag } from '@/hooks/useNFCManagement';
import { useNFCTags, useCreateNFCTag, useUpdateNFCTag, useDeleteNFCTag } from '@/hooks/useNFCQueries';
import { NFCPhysicalWriter } from './NFCPhysicalWriter';
import { NFCPhysicalReader } from './NFCPhysicalReader';
import { NFCTagTemplates } from './NFCTagTemplates';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NFCTagManagerProps {
  className?: string;
}

interface TagFormData {
  name: string;
  tag_uid: string;
  tag_type: string;
  description: string;
  vehicle_vin: string;
  location_name: string;
  is_active: boolean;
  is_permanent: boolean;
}

export function NFCTagManager({ className }: NFCTagManagerProps) {
  const { t, i18n } = useTranslation();

  // ✅ TanStack Query - automatic caching and state management
  const { data: tags = [], isLoading: loading, error } = useNFCTags();
  const createTagMutation = useCreateNFCTag();
  const updateTagMutation = useUpdateNFCTag();
  const deleteTagMutation = useDeleteNFCTag();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<NFCTag | null>(null);
  const [isWriterDialogOpen, setIsWriterDialogOpen] = useState(false);
  const [isReaderDialogOpen, setIsReaderDialogOpen] = useState(false);
  const [writingTag, setWritingTag] = useState<NFCTag | null>(null);
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    tag_uid: '',
    tag_type: 'vehicle',
    description: '',
    vehicle_vin: '',
    location_name: '',
    is_active: true,
    is_permanent: false
  });

  // Get locale for date-fns
  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'pt-BR': return ptBR;
      default: return undefined;
    }
  };

  // ✅ No useEffect needed - TanStack Query handles data fetching automatically

  // Filter tags based on search and filters
  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tag.tag_uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tag.vehicle_vin?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || tag.tag_type === filterType;
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && tag.is_active) ||
                         (filterStatus === 'inactive' && !tag.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreateTag = async () => {
    createTagMutation.mutate(
      {
        ...formData,
        dealer_id: 1, // This should come from auth context
      },
      {
        onSuccess: () => {
          setShowCreateDialog(false);
          resetForm();
        },
      }
    );
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;

    updateTagMutation.mutate(
      {
        id: editingTag.id,
        ...formData,
      },
      {
        onSuccess: () => {
          setEditingTag(null);
          resetForm();
        },
      }
    );
  };

  const handleDeleteTag = (tagId: string) => {
    setTagToDelete(tagId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTag = async () => {
    if (!tagToDelete) return;
    deleteTagMutation.mutate(tagToDelete, {
      onSuccess: () => {
        setTagToDelete(null);
        setDeleteDialogOpen(false);
      },
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      tag_uid: '',
      tag_type: 'vehicle',
      description: '',
      vehicle_vin: '',
      location_name: '',
      is_active: true,
      is_permanent: false
    });
  };

  const openEditDialog = (tag: NFCTag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name || '',
      tag_uid: tag.tag_uid || '',
      tag_type: tag.tag_type || 'vehicle',
      description: tag.description || '',
      vehicle_vin: tag.vehicle_vin || '',
      location_name: tag.location_name || '',
      is_active: tag.is_active,
      is_permanent: tag.is_permanent
    });
  };

  const generateTagUID = () => {
    const uid = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
    setFormData(prev => ({ ...prev, tag_uid: uid }));
  };

  const TagForm = ({ isEditing = false }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">{t('nfc_tracking.tag_manager.tag_name')}</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t('nfc_tracking.tag_manager.tag_name_placeholder')}
          />
        </div>

        <div>
          <Label htmlFor="tag_uid">{t('nfc_tracking.tag_manager.tag_uid')}</Label>
          <div className="flex gap-2">
            <Input
              id="tag_uid"
              value={formData.tag_uid}
              onChange={(e) => setFormData(prev => ({ ...prev, tag_uid: e.target.value }))}
              placeholder={t('nfc_tracking.tag_manager.uid_placeholder')}
            />
            <Button type="button" variant="outline" onClick={generateTagUID}>
              <QrCode className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="tag_type">{t('nfc_tracking.tag_manager.tag_type')}</Label>
        <Select
          value={formData.tag_type}
          onValueChange={(value) => setFormData(prev => ({ ...prev, tag_type: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vehicle">{t('nfc_tracking.tag_manager.vehicle_tag')}</SelectItem>
            <SelectItem value="location">{t('nfc_tracking.tag_manager.location_tag')}</SelectItem>
            <SelectItem value="equipment">{t('nfc_tracking.tag_manager.equipment_tag')}</SelectItem>
            <SelectItem value="process">{t('nfc_tracking.tag_manager.process_tag')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.tag_type === 'vehicle' && (
        <div>
          <Label htmlFor="vehicle_vin">{t('nfc_tracking.tag_manager.vehicle_vin')}</Label>
          <Input
            id="vehicle_vin"
            value={formData.vehicle_vin}
            onChange={(e) => setFormData(prev => ({ ...prev, vehicle_vin: e.target.value }))}
            placeholder={t('nfc_tracking.tag_manager.vin_placeholder')}
          />
        </div>
      )}

      {(formData.tag_type === 'location' || formData.tag_type === 'equipment') && (
        <div>
          <Label htmlFor="location_name">{t('nfc_tracking.tag_manager.location_name')}</Label>
          <Input
            id="location_name"
            value={formData.location_name}
            onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
            placeholder={t('nfc_tracking.tag_manager.location_placeholder')}
          />
        </div>
      )}

      <div>
        <Label htmlFor="description">{t('nfc_tracking.tag_manager.description')}</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder={t('nfc_tracking.tag_manager.description_placeholder')}
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
          />
          <Label htmlFor="is_active">{t('nfc_tracking.tag_manager.active_tag')}</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_permanent"
            checked={formData.is_permanent}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_permanent: checked }))}
          />
          <Label htmlFor="is_permanent">{t('nfc_tracking.tag_manager.permanent_tag')}</Label>
        </div>
      </div>
    </div>
  );

  const getTagIcon = (type: string) => {
    switch (type) {
      case 'vehicle': return <Car className="w-4 h-4" />;
      case 'location': return <MapPin className="w-4 h-4" />;
      case 'equipment': return <Settings className="w-4 h-4" />;
      case 'process': return <Activity className="w-4 h-4" />;
      default: return <Radio className="w-4 h-4" />;
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-success' : 'text-muted-foreground';
  };

  // ✅ Error state
  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('nfc_tracking.errors.load_failed')}: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('nfc_tracking.tag_manager.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('nfc_tracking.tag_manager.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PermissionGuard module="nfc_tracking" permission="write_nfc_tags">
            <Button
              variant="outline"
              onClick={() => setIsTemplatesDialogOpen(true)}
              className="mr-2"
            >
              <Settings className="h-4 w-4 mr-2" />
              {t('nfc.templates.quick_create')}
            </Button>
          </PermissionGuard>
          <PermissionGuard module="nfc_tracking" permission="read_nfc_tags">
            <Button
              variant="outline"
              onClick={() => setIsReaderDialogOpen(true)}
              className="mr-2"
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('nfc.reader.title')}
            </Button>
          </PermissionGuard>
          <PermissionGuard module="nfc_tracking" permission="write_nfc_tags">
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('nfc_tracking.tag_manager.register_new')}
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('nfc_tracking.tag_manager.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder={t('nfc_tracking.tag_manager.filter_type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('nfc_tracking.tag_manager.all_types')}</SelectItem>
                <SelectItem value="vehicle">{t('nfc_tracking.tag_manager.vehicle_tag')}</SelectItem>
                <SelectItem value="location">{t('nfc_tracking.tag_manager.location_tag')}</SelectItem>
                <SelectItem value="equipment">{t('nfc_tracking.tag_manager.equipment_tag')}</SelectItem>
                <SelectItem value="process">{t('nfc_tracking.tag_manager.process_tag')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t('nfc_tracking.tag_manager.filter_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('nfc_tracking.tag_manager.all_status')}</SelectItem>
                <SelectItem value="active">{t('nfc_tracking.tag_manager.active_only')}</SelectItem>
                <SelectItem value="inactive">{t('nfc_tracking.tag_manager.inactive_only')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              {filteredTags.length} {t('nfc_tracking.tag_manager.results')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTags.map((tag) => (
          <Card key={tag.id} className="hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full bg-muted flex items-center justify-center",
                    getStatusColor(tag.is_active)
                  )}>
                    {getTagIcon(tag.tag_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{tag.name}</h3>
                    <p className="text-xs text-muted-foreground">#{tag.tag_uid}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <PermissionGuard module="nfc_tracking" permission="write_nfc_tags" hideOnDeny>
                      <DropdownMenuItem onClick={() => {
                        setWritingTag(tag);
                        setIsWriterDialogOpen(true);
                      }}>
                        <Smartphone className="h-4 w-4 mr-2" />
                        {t('nfc.writer.write_to_physical')}
                      </DropdownMenuItem>
                    </PermissionGuard>
                    <PermissionGuard module="nfc_tracking" permission="manage_nfc_tags" hideOnDeny>
                      <DropdownMenuItem onClick={() => openEditDialog(tag)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                    </PermissionGuard>
                    <PermissionGuard module="nfc_tracking" permission="manage_nfc_tags" hideOnDeny>
                      <DropdownMenuItem
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </PermissionGuard>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={tag.is_active ? "default" : "secondary"}>
                  {tag.is_active ? t('nfc_tracking.tag_manager.active') : t('nfc_tracking.tag_manager.inactive')}
                </Badge>
                {tag.is_permanent && (
                  <Badge variant="outline">
                    {t('nfc_tracking.tag_manager.permanent')}
                  </Badge>
                )}
                <Badge variant="outline">
                  {tag.tag_type}
                </Badge>
              </div>

              {tag.vehicle_vin && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('nfc_tracking.tag_manager.vin')}: </span>
                  <code className="bg-muted px-1 rounded text-xs">{tag.vehicle_vin}</code>
                </div>
              )}

              {tag.location_name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('nfc_tracking.tag_manager.location')}: </span>
                  {tag.location_name}
                </div>
              )}

              {tag.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {tag.description}
                </p>
              )}

              <Separator />

              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{tag.scan_count} {t('nfc_tracking.tag_manager.scans')}</span>
                <span>
                  {tag.last_scanned_at
                    ? formatDistanceToNow(new Date(tag.last_scanned_at), {
                        addSuffix: true,
                        locale: getLocale()
                      })
                    : t('nfc_tracking.tag_manager.never_scanned')
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTags.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Radio className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? t('nfc_tracking.tag_manager.no_results')
                : t('nfc_tracking.tag_manager.no_tags')
              }
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? t('nfc_tracking.tag_manager.try_different_filters')
                : t('nfc_tracking.tag_manager.create_first_tag')
              }
            </p>
            {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('nfc_tracking.tag_manager.register_new')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editingTag && (
        <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {t('nfc_tracking.tag_manager.edit_tag')}: {editingTag.name}
              </DialogTitle>
            </DialogHeader>
            <TagForm isEditing={true} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTag(null)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdateTag} disabled={updateTagMutation.isPending}>
                {updateTagMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('nfc_tracking.tag_manager.create_tag')}</DialogTitle>
          </DialogHeader>
          <TagForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateTag} disabled={createTagMutation.isPending}>
              {createTagMutation.isPending ? t('common.creating') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Physical NFC Writer */}
      {writingTag && (
        <NFCPhysicalWriter
          isOpen={isWriterDialogOpen}
          onClose={() => {
            setIsWriterDialogOpen(false);
            setWritingTag(null);
          }}
          tag={writingTag}
          onSuccess={() => console.log('NFC tag written successfully')}
        />
      )}

      {/* Physical NFC Reader */}
      <NFCPhysicalReader
        isOpen={isReaderDialogOpen}
        onClose={() => setIsReaderDialogOpen(false)}
        onTagRead={(tagData) => console.log('Tag read:', tagData)}
      />

      {/* NFC Tag Templates */}
      <NFCTagTemplates
        isOpen={isTemplatesDialogOpen}
        onClose={() => setIsTemplatesDialogOpen(false)}
        onTemplateSelect={() => {
          // ✅ No need to manually refresh - TanStack Query auto-invalidates
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('nfc_tracking.tag_manager.delete_title', { defaultValue: 'Delete NFC Tag?' })}
        description={t('nfc_tracking.tag_manager.confirm_delete', { defaultValue: 'Are you sure you want to delete this NFC tag? This action cannot be undone.' })}
        confirmText={t('common.action_buttons.delete')}
        cancelText={t('common.action_buttons.cancel')}
        onConfirm={confirmDeleteTag}
        variant="destructive"
      />
    </div>
  );
}
