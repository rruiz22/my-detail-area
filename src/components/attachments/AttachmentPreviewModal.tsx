import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  X,
  File,
  Image,
  FileText,
  Archive,
  ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Attachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploaderName: string;
  createdAt: string;
}

interface AttachmentPreviewModalProps {
  attachment: Attachment | null;
  open: boolean;
  onClose: () => void;
  onDownload: (attachment: Attachment) => void;
  onDelete?: (attachment: Attachment) => void;
}

export function AttachmentPreviewModal({
  attachment,
  open,
  onClose,
  onDownload,
  onDelete
}: AttachmentPreviewModalProps) {
  const { t } = useTranslation();

  if (!attachment) return null;

  // Get file type icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-8 w-8 text-blue-600" />;
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-600" />;
    if (mimeType.includes('document')) return <FileText className="h-8 w-8 text-blue-600" />;
    if (mimeType.includes('zip')) return <Archive className="h-8 w-8 text-yellow-600" />;
    return <File className="h-8 w-8 text-gray-600" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon(attachment.mimeType)}
            {attachment.fileName}
          </DialogTitle>
          <DialogDescription>
            {t('attachments.preview_description', 'File preview and actions')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                {t('attachments.file_size', 'File Size')}
              </div>
              <div className="text-lg font-semibold">{formatFileSize(attachment.fileSize)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                {t('attachments.uploaded_by', 'Uploaded By')}
              </div>
              <div className="text-lg font-semibold">{attachment.uploaderName}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                {t('attachments.file_type', 'File Type')}
              </div>
              <Badge variant="outline" className="text-sm">
                {attachment.mimeType}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                {t('attachments.upload_date', 'Upload Date')}
              </div>
              <div className="text-lg font-semibold">{formatDate(attachment.createdAt)}</div>
            </div>
          </div>

          {/* Image preview (if image) */}
          {attachment.mimeType.startsWith('image/') && (
            <div className="text-center">
              <div className="inline-block p-4 bg-muted/10 rounded-lg">
                <div className="text-muted-foreground mb-2">
                  {t('attachments.image_preview', 'Image Preview')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('attachments.download_to_view', 'Download file to view full image')}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button
                onClick={() => onDownload(attachment)}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('attachments.download', 'Download')}
              </Button>

              {attachment.mimeType.startsWith('image/') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    toast({ description: t('attachments.download_to_view', 'Download file to view') });
                  }}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('attachments.open_external', 'View')}
                </Button>
              )}
            </div>

            {onDelete && (
              <Button
                variant="destructive"
                onClick={() => onDelete(attachment)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                {t('attachments.delete', 'Delete')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}