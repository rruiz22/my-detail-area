import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AttachmentUploadResult {
  success: boolean;
  attachment?: any;
  error?: string;
}

export const useAttachments = (orderId: string) => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Upload single file
  const uploadFile = async (file: File, uploadContext: string = 'comment'): Promise<AttachmentUploadResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('📎 Uploading file:', file.name);

      const fileData = await fileToBase64(file);

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
        user: user.email
      });

      const { data, error } = await supabase.functions.invoke('upload-order-attachment', {
        body: payload
      });

      if (error) {
        console.error('❌ Upload failed:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ File uploaded successfully:', data.attachment.id);
      return { success: true, attachment: data.attachment };

    } catch (error: any) {
      console.error('❌ File upload error:', error);
      return { success: false, error: error.message };
    }
  };

  // Upload multiple files
  const uploadFiles = async (files: File[], uploadContext: string = 'comment'): Promise<AttachmentUploadResult[]> => {
    if (files.length === 0) return [];

    setUploading(true);
    try {
      console.log(`📎 Uploading ${files.length} files...`);

      const uploadPromises = files.map(file => uploadFile(file, uploadContext));
      const results = await Promise.allSettled(uploadPromises);

      const uploadResults: AttachmentUploadResult[] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`❌ File ${files[index].name} upload failed:`, result.reason);
          return { success: false, error: result.reason?.message || 'Upload failed' };
        }
      });

      const successful = uploadResults.filter(r => r.success).length;
      const failed = uploadResults.filter(r => !r.success).length;

      if (successful > 0) {
        toast.success(`${successful} file(s) uploaded successfully`);
      }
      if (failed > 0) {
        toast.error(`${failed} file(s) failed to upload`);
      }

      return uploadResults;

    } catch (error: any) {
      console.error('❌ Bulk upload error:', error);
      toast.error('Failed to upload files');
      return [];
    } finally {
      setUploading(false);
    }
  };

  // Upload selected files and clear selection
  const uploadSelectedFiles = async (uploadContext: string = 'comment'): Promise<AttachmentUploadResult[]> => {
    const results = await uploadFiles(selectedFiles, uploadContext);

    // Clear successful uploads from selection
    const successfulCount = results.filter(r => r.success).length;
    if (successfulCount > 0) {
      setSelectedFiles(prev => prev.slice(successfulCount));
    }

    return results;
  };

  // File selection handlers
  const addFiles = useCallback((newFiles: File[]) => {
    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  return {
    selectedFiles,
    uploading,
    addFiles,
    removeFile,
    clearFiles,
    uploadFiles,
    uploadSelectedFiles
  };
};