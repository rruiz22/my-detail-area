import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    DropdownMenuLabel,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    MediaType,
    useDeleteMedia,
    useUpdateMedia,
    useUploadMedia,
    useVehicleMedia,
    VehicleMedia,
} from '@/hooks/useVehicleMedia';
import { useWorkItems } from '@/hooks/useVehicleWorkItems';
import { cn } from '@/lib/utils';
import {
    CheckSquare,
    Edit,
    FileText,
    Filter,
    Grid3x3,
    Image as ImageIcon,
    List,
    Loader2,
    MoreHorizontal,
    Search,
    Square,
    Trash2,
    Upload,
    Video,
    X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaLightbox } from '../MediaLightbox';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface VehicleMediaTabProps {
  vehicleId: string;
  className?: string;
}

export function VehicleMediaTab({ vehicleId, className }: VehicleMediaTabProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: mediaItems = [], isLoading } = useVehicleMedia(vehicleId);
  const { data: workItems = [] } = useWorkItems(vehicleId);
  const uploadMedia = useUploadMedia();
  const updateMedia = useUpdateMedia();
  const deleteMedia = useDeleteMedia();

  // Real-time subscription for media
  useRealtimeSubscription({
    table: 'vehicle_media',
    filter: 'vehicle_id',
    filterValue: vehicleId,
    queryKeysToInvalidate: [
      ['vehicle-media', vehicleId],
      ['vehicle-activity-log'],
    ],
    enabled: !!vehicleId,
  });

  // State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<VehicleMedia | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>('intake');
  const [uploadWorkItemId, setUploadWorkItemId] = useState<string>('');

  // Edit state
  const [editCategory, setEditCategory] = useState('');
  const [editWorkItemId, setEditWorkItemId] = useState<string>('');

  // Filter categories (from database schema)
  const categories = [
    { value: 'all', label: t('get_ready.media.categories.all') },
    { value: 'intake', label: t('get_ready.media.categories.intake') },
    { value: 'damage', label: t('get_ready.media.categories.damage') },
    { value: 'work_in_progress', label: t('get_ready.media.categories.work_in_progress') },
    { value: 'completion', label: t('get_ready.media.categories.completion') },
    { value: 'exterior_360', label: t('get_ready.media.categories.exterior_360') },
    { value: 'interior', label: t('get_ready.media.categories.interior') },
    { value: 'undercarriage', label: t('get_ready.media.categories.undercarriage') },
    { value: 'engine_bay', label: t('get_ready.media.categories.engine_bay') },
    { value: 'vin_plates', label: t('get_ready.media.categories.vin_plates') },
    { value: 'odometer', label: t('get_ready.media.categories.odometer') },
  ];

  // Filtered media by category and search
  const filteredMedia = mediaItems.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSearch = searchTerm === '' ||
      item.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate counters by type
  const counters = mediaItems.reduce(
    (acc, item) => {
      if (item.media_type) {
        acc[item.media_type]++;
      }
      acc.total++;
      return acc;
    },
    { photo: 0, video: 0, document: 0, total: 0 }
  );

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    setUploadModalOpen(true);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      for (const file of selectedFiles) {
        await uploadMedia.mutateAsync({
          vehicle_id: vehicleId,
          file,
          category: uploadCategory,
          linked_work_item_id: uploadWorkItemId || undefined,
        });
      }

      setUploadModalOpen(false);
      setSelectedFiles([]);
      setUploadCategory('intake');
      setUploadWorkItemId('');
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleEdit = async () => {
    if (!selectedMedia) return;

    await updateMedia.mutateAsync({
      id: selectedMedia.id,
      vehicleId,
      category: editCategory,
      linked_work_item_id: editWorkItemId || undefined,
    });

    setEditModalOpen(false);
    setSelectedMedia(null);
  };

  const handleDelete = async (media: VehicleMedia) => {
    if (confirm(t('get_ready.media.confirm_delete'))) {
      await deleteMedia.mutateAsync({
        id: media.id,
        vehicleId,
        filePath: media.file_path,
      });
    }
  };

  const openEditModal = (media: VehicleMedia) => {
    setSelectedMedia(media);
    setEditCategory(media.category || 'intake');
    setEditWorkItemId(media.linked_work_item_id || '');
    setEditModalOpen(true);
  };

  const openLightbox = (media: VehicleMedia) => {
    if (selectionMode) return; // Don't open lightbox in selection mode
    const index = filteredMedia.findIndex(m => m.id === media.id);
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  };

  const toggleSelection = (mediaId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(mediaId)) {
      newSelected.delete(mediaId);
    } else {
      newSelected.add(mediaId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(filteredMedia.map(m => m.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedItems(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (!confirm(t('get_ready.media.bulk.confirm_delete', { count: selectedItems.size }))) {
      return;
    }

    try {
      const mediaToDelete = filteredMedia.filter(m => selectedItems.has(m.id));
      for (const media of mediaToDelete) {
        await deleteMedia.mutateAsync({
          id: media.id,
          vehicleId,
          filePath: media.file_path,
        });
      }
      setSelectedItems(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Bulk delete error:', error);
    }
  };

  const getMediaIcon = (mediaType: MediaType) => {
    switch (mediaType) {
      case 'photo':
        return <ImageIcon className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getWorkItemTitle = (workItemId: string | undefined) => {
    if (!workItemId) return null;
    const item = workItems.find(wi => wi.id === workItemId);
    return item?.title || null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{counters.photo}</div>
              <div className="text-xs text-muted-foreground">{t('get_ready.media.photos')}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-purple-600" />
            <div>
              <div className="text-2xl font-bold">{counters.video}</div>
              <div className="text-xs text-muted-foreground">{t('get_ready.media.videos')}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <div>
              <div className="text-2xl font-bold">{counters.document}</div>
              <div className="text-xs text-muted-foreground">{t('get_ready.media.documents')}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{counters.total}</div>
              <div className="text-xs text-muted-foreground">{t('get_ready.media.total')}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="space-y-3 mb-4">
        {/* Search bar (always visible) */}
        {mediaItems.length > 0 && !selectionMode && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('get_ready.media.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!selectionMode ? (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
            /* Selection Mode Actions */
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedItems.size} {t('get_ready.media.bulk.selected')}
              </span>
              <Button size="sm" variant="outline" onClick={selectAll}>
                {t('get_ready.media.bulk.select_all')}
              </Button>
              <Button size="sm" variant="outline" onClick={deselectAll}>
                {t('get_ready.media.bulk.deselect_all')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={selectedItems.size === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('get_ready.media.bulk.delete')} ({selectedItems.size})
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!selectionMode && (
            <>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileSelect(e.target.files)}
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                className="hidden"
              />
              <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {t('get_ready.media.upload')}
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant={selectionMode ? 'default' : 'outline'}
            onClick={toggleSelectionMode}
          >
            {selectionMode ? (
              <>
                <X className="h-4 w-4 mr-2" />
                {t('common.action_buttons.cancel')}
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                {t('get_ready.media.bulk.select')}
              </>
            )}
          </Button>
          </div>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'flex-1 overflow-y-auto border-2 border-dashed rounded-lg p-4 pb-6 transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border',
        )}
      >
        {filteredMedia.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4">
              {filteredMedia.map((media) => (
                <Card key={media.id} className={cn(
                  "group relative overflow-hidden hover:shadow-lg transition-shadow flex flex-col",
                  selectionMode && selectedItems.has(media.id) && "ring-2 ring-primary"
                )}>
                  {/* Selection Checkbox */}
                  {selectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <Button
                        size="icon"
                        variant={selectedItems.has(media.id) ? 'default' : 'secondary'}
                        className="h-6 w-6 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(media.id);
                        }}
                      >
                        {selectedItems.has(media.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Media Preview */}
                  <div
                    className="aspect-square bg-gray-100 cursor-pointer relative flex-shrink-0"
                    onClick={() => selectionMode ? toggleSelection(media.id) : openLightbox(media)}
                  >
                    {media.media_type === 'photo' ? (
                      <img
                        src={media.file_url}
                        alt={media.title || media.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : media.media_type === 'video' ? (
                      <div className="flex flex-col items-center justify-center w-full h-full gap-2">
                        <Video className="h-12 w-12 text-purple-600" />
                        <span className="text-xs text-gray-500 font-medium">VIDEO</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full gap-2 p-3">
                        <FileText className="h-12 w-12 text-gray-600" />
                        <span className="text-xs text-gray-500 font-medium text-center">DOCUMENT</span>
                      </div>
                    )}
                  </div>

                  {/* Media Info - Enhanced spacing */}
                  <div className="p-3 flex-1 flex flex-col justify-between min-h-[80px]">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        {/* File name with tooltip */}
                        <div
                          className="text-sm font-medium line-clamp-2 break-words mb-1.5"
                          title={media.title || media.file_name}
                        >
                          {media.title || media.file_name}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1">
                          {media.category && (
                            <Badge variant="outline" className="text-xs">
                              {t(`get_ready.media.categories.${media.category}`)}
                            </Badge>
                          )}
                          {media.linked_work_item_id && getWorkItemTitle(media.linked_work_item_id) && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                              {getWorkItemTitle(media.linked_work_item_id)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('get_ready.actions.actions')}</DropdownMenuLabel>

                          <DropdownMenuItem onClick={() => openEditModal(media)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('get_ready.actions.edit')}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleDelete(media)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('get_ready.actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* File metadata */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto">
                      {getMediaIcon(media.media_type)}
                      <span className="font-medium">{formatFileSize(media.file_size)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredMedia.map((media) => (
                <Card key={media.id} className="p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    <div
                      className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 cursor-pointer overflow-hidden"
                      onClick={() => openLightbox(media)}
                    >
                      {media.media_type === 'photo' ? (
                        <img
                          src={media.file_url}
                          alt={media.title || media.file_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          {getMediaIcon(media.media_type)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm truncate">
                          {media.file_name}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                        {media.category && (
                          <Badge variant="outline" className="text-xs">
                            {t(`get_ready.media.categories.${media.category}`)}
                          </Badge>
                        )}
                        {media.linked_work_item_id && getWorkItemTitle(media.linked_work_item_id) && (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                            {getWorkItemTitle(media.linked_work_item_id)}
                          </Badge>
                        )}
                        <span>{formatFileSize(media.file_size)}</span>
                        {media.metadata?.width && media.metadata?.height && (
                          <span>{media.metadata.width}x{media.metadata.height}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('get_ready.actions.actions')}</DropdownMenuLabel>

                        <DropdownMenuItem onClick={() => openEditModal(media)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('get_ready.actions.edit')}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleDelete(media)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('get_ready.actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div className="text-sm mb-2">{t('get_ready.media.no_media')}</div>
            <div className="text-xs">{t('get_ready.media.drag_drop_hint')}</div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('get_ready.media.upload_media')}</DialogTitle>
            <DialogDescription>{t('get_ready.media.upload_description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>{t('get_ready.media.selected_files')}</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                      {getMediaIcon(
                        file.type.startsWith('image/') ? 'photo' :
                        file.type.startsWith('video/') ? 'video' : 'document'
                      )}
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="upload_category">{t('get_ready.media.category')}</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intake">{t('get_ready.media.categories.intake')}</SelectItem>
                  <SelectItem value="damage">{t('get_ready.media.categories.damage')}</SelectItem>
                  <SelectItem value="work_in_progress">{t('get_ready.media.categories.work_in_progress')}</SelectItem>
                  <SelectItem value="completion">{t('get_ready.media.categories.completion')}</SelectItem>
                  <SelectItem value="exterior_360">{t('get_ready.media.categories.exterior_360')}</SelectItem>
                  <SelectItem value="interior">{t('get_ready.media.categories.interior')}</SelectItem>
                  <SelectItem value="undercarriage">{t('get_ready.media.categories.undercarriage')}</SelectItem>
                  <SelectItem value="engine_bay">{t('get_ready.media.categories.engine_bay')}</SelectItem>
                  <SelectItem value="vin_plates">{t('get_ready.media.categories.vin_plates')}</SelectItem>
                  <SelectItem value="odometer">{t('get_ready.media.categories.odometer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="upload_work_item">{t('get_ready.media.link_to_work_item')} ({t('common.optional')})</Label>
              <Select value={uploadWorkItemId || 'none'} onValueChange={(val) => setUploadWorkItemId(val === 'none' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('get_ready.media.select_work_item')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('get_ready.media.no_work_item')}</SelectItem>
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
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
              {t('common.action_buttons.cancel')}
            </Button>
            <Button onClick={handleUpload} disabled={uploadMedia.isPending}>
              {uploadMedia.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('get_ready.media.upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('get_ready.media.edit_media')}</DialogTitle>
            <DialogDescription>{t('get_ready.media.edit_description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_category">{t('get_ready.media.category')}</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intake">{t('get_ready.media.categories.intake')}</SelectItem>
                  <SelectItem value="damage">{t('get_ready.media.categories.damage')}</SelectItem>
                  <SelectItem value="work_in_progress">{t('get_ready.media.categories.work_in_progress')}</SelectItem>
                  <SelectItem value="completion">{t('get_ready.media.categories.completion')}</SelectItem>
                  <SelectItem value="exterior_360">{t('get_ready.media.categories.exterior_360')}</SelectItem>
                  <SelectItem value="interior">{t('get_ready.media.categories.interior')}</SelectItem>
                  <SelectItem value="undercarriage">{t('get_ready.media.categories.undercarriage')}</SelectItem>
                  <SelectItem value="engine_bay">{t('get_ready.media.categories.engine_bay')}</SelectItem>
                  <SelectItem value="vin_plates">{t('get_ready.media.categories.vin_plates')}</SelectItem>
                  <SelectItem value="odometer">{t('get_ready.media.categories.odometer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_work_item">{t('get_ready.media.link_to_work_item')}</Label>
              <Select value={editWorkItemId || 'none'} onValueChange={(val) => setEditWorkItemId(val === 'none' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('get_ready.media.select_work_item')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('get_ready.media.no_work_item')}</SelectItem>
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
              {t('common.action_buttons.cancel')}
            </Button>
            <Button onClick={handleEdit} disabled={updateMedia.isPending}>
              {updateMedia.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.action_buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Lightbox with Navigation */}
      <MediaLightbox
        media={filteredMedia}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
}
