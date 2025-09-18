import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Paperclip,
  Upload,
  X,
  File,
  Image,
  FileText,
  Archive
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FileUploadProps {
  orderId: string;
  onUploadComplete?: (attachment: any) => void;
  uploadContext?: string;
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  id: string;
}

export function FileUpload({
  orderId,
  onUploadComplete,
  uploadContext = 'comment',
  disabled = false,
  className
}: FileUploadProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:mime/type;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Get file type icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="h-4 w-4" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <Archive className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      await uploadFile(file);
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload individual file
  const uploadFile = async (file: File) => {
    if (!user) {
      toast.error(t('attachments.auth_required', 'Please log in to upload files'));
      return;
    }

    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add to uploading files list
    const uploadingFile: UploadingFile = {
      file,
      progress: 0,
      id: uploadId
    };

    setUploadingFiles(prev => [...prev, uploadingFile]);

    try {
      console.log('📎 Starting file upload:', file.name, 'User:', user.email);

      // Update progress
      setUploadingFiles(prev =>
        prev.map(f => f.id === uploadId ? { ...f, progress: 25 } : f)
      );

      // Convert to base64
      const fileData = await fileToBase64(file);

      // Update progress
      setUploadingFiles(prev =>
        prev.map(f => f.id === uploadId ? { ...f, progress: 50 } : f)
      );

      // Debug payload
      const payload = {
        orderId,
        fileName: file.name,
        fileData,
        mimeType: file.type,
        fileSize: file.size,
        uploadContext,
        description: `Uploaded via order comments`
      };

      console.log('📤 Upload payload:', {
        orderId: payload.orderId,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        fileSize: payload.fileSize,
        uploadContext: payload.uploadContext,
        user: user.email,
        fileDataLength: fileData.length
      });

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('upload-order-attachment', {
        body: payload
      });

      if (error) {
        console.error('❌ Upload failed:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code || 'unknown',
          details: error.details || 'none'
        });
        throw error;
      }

      // Update progress to complete
      setUploadingFiles(prev =>
        prev.map(f => f.id === uploadId ? { ...f, progress: 100 } : f)
      );

      console.log('✅ File uploaded successfully:', data.attachment);
      toast.success(t('attachments.upload_success', 'File uploaded successfully'));

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(data.attachment);
      }

      // Remove from uploading list after a brief delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
      }, 1000);

    } catch (error) {
      console.error('❌ File upload error:', error);
      toast.error(t('attachments.upload_failed', 'Failed to upload file'));

      // Remove from uploading list
      setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
    }
  };

  // Remove uploading file
  const removeUploadingFile = (uploadId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
  };

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip"
      />

      {/* Upload button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="text-xs"
      >
        <Paperclip className="h-3 w-3 mr-1" />
        {t('attachments.attach', 'Attach')}
      </Button>

      {/* Uploading files progress */}
      {uploadingFiles.length > 0 && (
        <div className="mt-2 space-y-2">
          {uploadingFiles.map((uploadingFile) => (
            <div key={uploadingFile.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              {getFileIcon(uploadingFile.file.type)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate">
                    {uploadingFile.file.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => removeUploadingFile(uploadingFile.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Progress value={uploadingFile.progress} className="h-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}