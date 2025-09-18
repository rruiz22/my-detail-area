import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  File,
  Image,
  FileText,
  Archive,
  Download,
  Eye,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  orderId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadContext?: string;
  description?: string;
  isPublic?: boolean;
  createdAt: string;
  // User profile data
  uploaderName: string;
  uploaderEmail: string;
}

interface AttachmentsListProps {
  orderId: string;
  context?: string;
  className?: string;
  onAttachmentChange?: () => void;
}

export function AttachmentsList({
  orderId,
  context = 'comment',
  className,
  onAttachmentChange
}: AttachmentsListProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch attachments
  const fetchAttachments = async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      console.log('📎 Fetching attachments for order:', orderId);

      // Get attachments data
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('order_attachments')
        .select(`
          id,
          order_id,
          file_name,
          file_path,
          file_size,
          mime_type,
          uploaded_by,
          upload_context,
          description,
          is_public,
          created_at
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (attachmentsError) {
        console.error('❌ Error fetching attachments:', attachmentsError);
        return;
      }

      if (!attachmentsData || attachmentsData.length === 0) {
        console.log('📊 No attachments found');
        setAttachments([]);
        return;
      }

      // Get uploader profiles
      const uploaderIds = [...new Set(attachmentsData.map(a => a.uploaded_by))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', uploaderIds);

      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile])
      );

      // Transform data
      const transformedAttachments: Attachment[] = attachmentsData
        .map(att => {
          const profile = profilesMap.get(att.uploaded_by);
          return {
            id: att.id,
            orderId: att.order_id,
            fileName: att.file_name,
            filePath: att.file_path,
            fileSize: att.file_size,
            mimeType: att.mime_type,
            uploadedBy: att.uploaded_by,
            uploadContext: att.upload_context,
            description: att.description,
            isPublic: att.is_public,
            createdAt: att.created_at,
            uploaderName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown',
            uploaderEmail: profile?.email || ''
          };
        });

      console.log(`✅ Loaded ${transformedAttachments.length} attachments`);
      setAttachments(transformedAttachments);

    } catch (error) {
      console.error('❌ Error fetching attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Download attachment
  const downloadAttachment = async (attachment: Attachment) => {
    try {
      console.log('📥 Downloading attachment:', attachment.fileName);

      const { data, error } = await supabase.storage
        .from('order-attachments')
        .download(attachment.filePath);

      if (error) {
        console.error('❌ Download error:', error);
        toast.error(t('attachments.download_failed', 'Failed to download file'));
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t('attachments.download_success', 'File downloaded'));

    } catch (error) {
      console.error('❌ Download error:', error);
      toast.error(t('attachments.download_failed', 'Failed to download file'));
    }
  };

  // Get file type icon
  const getFileIcon = (mimeType: string, size: number = 16) => {
    const iconProps = { className: `h-${size/4} w-${size/4}` };

    if (mimeType.startsWith('image/')) return <Image {...iconProps} className="h-4 w-4 text-blue-600" />;
    if (mimeType.includes('pdf')) return <FileText {...iconProps} className="h-4 w-4 text-red-600" />;
    if (mimeType.includes('document') || mimeType.includes('word')) return <FileText {...iconProps} className="h-4 w-4 text-blue-600" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <Archive {...iconProps} className="h-4 w-4 text-yellow-600" />;
    return <File {...iconProps} className="h-4 w-4 text-gray-600" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format upload time
  const formatUploadTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  // Load attachments on mount
  useEffect(() => {
    fetchAttachments();
  }, [orderId]);

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground">
        {t('attachments.loading', 'Loading attachments...')}
      </div>
    );
  }

  if (attachments.length === 0) {
    return null; // Don't show anything if no attachments
  }

  return (
    <div className={`space-y-2 mt-2 ${className}`}>
      <div className="text-xs text-muted-foreground">
        {t('attachments.count', '{{count}} attachments', { count: attachments.length })}
      </div>

      <div className="space-y-1">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-2 p-2 bg-muted/20 rounded border text-xs"
          >
            {getFileIcon(attachment.mimeType)}

            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{attachment.fileName}</div>
              <div className="text-muted-foreground">
                {formatFileSize(attachment.fileSize)} • {attachment.uploaderName} • {formatUploadTime(attachment.createdAt)}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {attachment.mimeType.startsWith('image/') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    // TODO: Implement image preview modal
                    toast.info('Image preview coming soon');
                  }}
                  title={t('attachments.preview', 'Preview')}
                >
                  <Eye className="h-3 w-3" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => downloadAttachment(attachment)}
                title={t('attachments.download', 'Download')}
              >
                <Download className="h-3 w-3" />
              </Button>

              {attachment.uploadedBy === user?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  onClick={() => {
                    // TODO: Implement delete functionality
                    toast.info('Delete functionality coming soon');
                  }}
                  title={t('attachments.delete', 'Delete')}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}