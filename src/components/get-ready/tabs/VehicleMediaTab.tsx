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
import { cn } from '@/lib/utils';
import {
    Edit,
    FileText,
    Filter,
    Grid3x3,
    Image as ImageIcon,
    List,
    Loader2,
    MoreHorizontal,
    Trash2,
    Upload,
    Video,
    X
} from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface VehicleMediaTabProps {
  vehicleId: string;
  className?: string;
}

export function VehicleMediaTab({ vehicleId, className }: VehicleMediaTabProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: mediaItems = [], isLoading } = useVehicleMedia(vehicleId);
  const uploadMedia = useUploadMedia();
  const updateMedia = useUpdateMedia();
  const deleteMedia = useDeleteMedia();

  // State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<VehicleMedia | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>('intake');

  // Edit state
  const [editCategory, setEditCategory] = useState('');

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

  // Filtered media
  const filteredMedia = categoryFilter === 'all'
    ? mediaItems
    : mediaItems.filter(item => item.category === categoryFilter);

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
        });
      }

      setUploadModalOpen(false);
      setSelectedFiles([]);
      setUploadCategory('intake');
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
    setEditModalOpen(true);
  };

  const openPreviewModal = (media: VehicleMedia) => {
    setSelectedMedia(media);
    setPreviewModalOpen(true);
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
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
        </div>

        <div className="flex items-center gap-2">
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
                <Card key={media.id} className="group relative overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  {/* Media Preview */}
                  <div
                    className="aspect-square bg-gray-100 cursor-pointer relative flex-shrink-0"
                    onClick={() => openPreviewModal(media)}
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

                        {/* Category badge */}
                        {media.category && (
                          <Badge variant="outline" className="text-xs">
                            {t(`get_ready.media.categories.${media.category}`)}
                          </Badge>
                        )}
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
                      onClick={() => openPreviewModal(media)}
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {media.category && (
                          <Badge variant="outline" className="text-xs">
                            {t(`get_ready.media.categories.${media.category}`)}
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

      {/* Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedMedia?.title || selectedMedia?.file_name}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setPreviewModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {selectedMedia && (
            <div className="space-y-4">
              {/* Media Preview */}
              <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center max-h-[60vh]">
                {selectedMedia.media_type === 'photo' ? (
                  <img
                    src={selectedMedia.file_url}
                    alt={selectedMedia.title || selectedMedia.file_name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : selectedMedia.media_type === 'video' ? (
                  <video
                    src={selectedMedia.file_url}
                    controls
                    className="max-w-full max-h-full"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <a
                    href={selectedMedia.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-4 p-8 text-white hover:text-gray-300"
                  >
                    <FileText className="h-16 w-16" />
                    <span className="text-sm">{t('get_ready.media.view_document')}</span>
                  </a>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                {selectedMedia.description && (
                  <div className="text-sm text-muted-foreground">
                    {selectedMedia.description}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{formatFileSize(selectedMedia.file_size)}</span>
                  {selectedMedia.metadata?.width && selectedMedia.metadata?.height && (
                    <span>{selectedMedia.metadata.width}x{selectedMedia.metadata.height}</span>
                  )}
                  {selectedMedia.category && (
                    <Badge variant="outline">
                      {t(`get_ready.media.categories.${selectedMedia.category}`)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
