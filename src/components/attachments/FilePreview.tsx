import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  File,
  Image,
  FileText,
  Archive,
  Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ImagePreviewModal } from './ImagePreviewModal';

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  className?: string;
}

export function FilePreview({ file, onRemove, className }: FilePreviewProps) {
  const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);

  // Get file type icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-600" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-red-600" />;
    if (mimeType.includes('document') || mimeType.includes('word')) return <FileText className="h-4 w-4 text-blue-600" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <Archive className="h-4 w-4 text-yellow-600" />;
    return <File className="h-4 w-4 text-gray-600" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type badge color
  const getFileTypeBadge = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'bg-blue-100 text-blue-800';
    if (mimeType.includes('pdf')) return 'bg-red-100 text-red-800';
    if (mimeType.includes('document')) return 'bg-blue-100 text-blue-800';
    if (mimeType.includes('zip')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Create preview URL for images
  const getPreviewUrl = (): string | null => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const previewUrl = getPreviewUrl();

  return (
    <div className={`flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30 ${className}`}>
      {/* File icon or image preview */}
      <div className="flex-shrink-0">
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt={file.name}
              className="w-12 h-12 object-cover rounded border"
              onLoad={() => URL.revokeObjectURL(previewUrl)}
            />
            <div className="absolute inset-0 bg-black/20 rounded flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Eye className="h-4 w-4 text-white" />
            </div>
          </div>
        ) : (
          <div className="w-12 h-12 bg-background rounded border flex items-center justify-center">
            {getFileIcon(file.type)}
          </div>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium truncate">{file.name}</span>
          <Badge variant="outline" className={`text-xs ${getFileTypeBadge(file.type)}`}>
            {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(file.size)} • {t('attachments.ready_to_upload', 'Ready to upload')}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {previewUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowPreview(true)}
            title={t('attachments.preview', 'Preview')}
          >
            <Eye className="h-3 w-3" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onRemove}
          title={t('attachments.remove', 'Remove')}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <ImagePreviewModal
          imageUrl={showPreview ? previewUrl : null}
          imageName={file.name}
          open={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}