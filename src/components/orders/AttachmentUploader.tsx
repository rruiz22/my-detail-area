import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, Image, FileText, X, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface OrderAttachment {
  id: string;
  order_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  upload_context: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface AttachmentUploaderProps {
  orderId: string;
  attachments: OrderAttachment[];
  onAttachmentUploaded: (attachment: OrderAttachment) => void;
  onAttachmentDeleted: (attachmentId: string) => void;
  canUpload?: boolean;
  canDelete?: boolean;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  orderId,
  attachments,
  onAttachmentUploaded,
  onAttachmentDeleted,
  canUpload = true,
  canDelete = true
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!canUpload || !user) {
      toast({ variant: 'destructive', description: t('attachments.uploadNotAllowed') });
      return;
    }

    for (const file of acceptedFiles) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({ variant: 'destructive', description: t('attachments.fileTooLarge') });
        continue;
      }

      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({ variant: 'destructive', description: t('attachments.unsupportedFileType') });
        continue;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        // Convert file to base64
        const fileReader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          fileReader.onload = () => {
            const base64 = fileReader.result as string;
            resolve(base64.split(',')[1]); // Remove data:type;base64, prefix
          };
          fileReader.onerror = reject;
          fileReader.readAsDataURL(file);
        });

        setUploadProgress(50);

        // Upload via edge function
        const { data, error } = await supabase.functions.invoke('upload-order-attachment', {
          body: {
            orderId,
            fileName: file.name,
            fileData,
            mimeType: file.type,
            fileSize: file.size,
            description: null,
            uploadContext: 'general'
          }
        });

        setUploadProgress(100);

        if (error) {
          console.error('Upload error:', error);
          toast({ variant: 'destructive', description: t('attachments.uploadFailed') });
          continue;
        }

        if (data?.attachment) {
          onAttachmentUploaded(data.attachment);
          toast({ description: t('attachments.uploadSuccess') });
        }

      } catch (error) {
        console.error('Unexpected upload error:', error);
        toast({ variant: 'destructive', description: t('attachments.uploadFailed') });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  }, [orderId, canUpload, user, onAttachmentUploaded, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !canUpload || uploading,
    multiple: true,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    }
  });

  const handleDeleteAttachment = async (attachment: OrderAttachment) => {
    if (!canDelete) {
      toast({ variant: 'destructive', description: t('attachments.deleteNotAllowed') });
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('order-attachments')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('order_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) {
        console.error('Database delete error:', dbError);
        toast({ variant: 'destructive', description: t('attachments.deleteFailed') });
        return;
      }

      onAttachmentDeleted(attachment.id);
      toast({ description: t('attachments.deleteSuccess') });

    } catch (error) {
      console.error('Unexpected delete error:', error);
      toast({ variant: 'destructive', description: t('attachments.deleteFailed') });
    }
  };

  const handleDownloadAttachment = async (attachment: OrderAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('order-attachments')
        .download(attachment.file_path);

      if (error) {
        console.error('Download error:', error);
        toast({ variant: 'destructive', description: t('attachments.downloadFailed') });
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Unexpected download error:', error);
      toast({ variant: 'destructive', description: t('attachments.downloadFailed') });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-6 w-6" />;
    if (mimeType === 'application/pdf') return <FileText className="h-6 w-6" />;
    return <File className="h-6 w-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canUpload && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                ${uploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              
              {uploading ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('attachments.uploading')}</p>
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                </div>
              ) : isDragActive ? (
                <p className="text-sm text-muted-foreground">
                  {t('attachments.dropFiles')}
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {t('attachments.dragDropOrClick')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('attachments.supportedFormats')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('attachments.maxFileSize')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h4 className="text-sm font-medium mb-4">
              {t('attachments.attachedFiles')} ({attachments.length})
            </h4>
            
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getFileIcon(attachment.mime_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.file_name}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {formatFileSize(attachment.file_size)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(attachment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadAttachment(attachment)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAttachment(attachment)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};