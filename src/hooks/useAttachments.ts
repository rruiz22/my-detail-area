import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { compressImage, shouldCompressImage } from '@/utils/imageCompression';
import { slackNotificationService } from '@/services/slackNotificationService';

export interface AttachmentUploadResult {
  success: boolean;
  attachment?: any;
  error?: string;
}

export const useAttachments = (orderId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
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

  // Upload single file with optional comment linking
  const uploadFile = async (
    file: File,
    uploadContext: string = 'comment',
    commentId?: string
  ): Promise<AttachmentUploadResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('📎 Uploading file:', file.name, commentId ? `linked to comment ${commentId}` : '(order-level)');

      // Compress image if needed
      let fileToUpload = file;
      if (shouldCompressImage(file)) {
        console.log('🗜️ Compressing image before upload...');
        try {
          fileToUpload = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85
          });
        } catch (compressionError) {
          console.warn('⚠️ Compression failed, using original:', compressionError);
          // Continue with original file if compression fails
        }
      }

      const fileData = await fileToBase64(fileToUpload);

      const payload = {
        orderId,
        commentId,  // Link to comment if provided
        fileName: file.name,
        fileData,
        mimeType: fileToUpload.type,
        fileSize: fileToUpload.size,
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

      // 📤 SLACK NOTIFICATION: File Uploaded
      try {
        // Get order data for notification
        const { data: orderData } = await supabase
          .from('orders')
          .select('order_number, custom_order_number, dealer_id, order_type, stock_number, vehicle_year, vehicle_make, vehicle_model, short_link')
          .eq('id', orderId)
          .single();

        if (orderData) {
          // Get uploader's name
          const { data: uploaderProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', user.id)
            .single();

          const uploadedByName = uploaderProfile?.first_name
            ? `${uploaderProfile.first_name} ${uploaderProfile.last_name || ''}`.trim()
            : user.email || 'Someone';

          const getNotificationModule = (orderType: string): 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' => {
            const mapping: Record<string, 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash'> = {
              'sales': 'sales_orders',
              'service': 'service_orders',
              'recon': 'recon_orders',
              'carwash': 'car_wash'
            };
            return mapping[orderType] || 'sales_orders';
          };

          const notifModule = getNotificationModule(orderData.order_type || 'sales');

          const isEnabled = await slackNotificationService.isEnabled(
            orderData.dealer_id,
            notifModule,
            'file_uploaded'
          );

          if (isEnabled) {
            await slackNotificationService.sendNotification({
              orderId: orderId,
              dealerId: orderData.dealer_id,
              module: notifModule,
              eventType: 'file_uploaded',
              eventData: {
                orderNumber: orderData.order_number || orderData.custom_order_number || orderId,
                stockNumber: orderData.stock_number,
                vehicleInfo: `${orderData.vehicle_year || ''} ${orderData.vehicle_make || ''} ${orderData.vehicle_model || ''}`.trim() || undefined,
                shortLink: orderData.short_link || `${window.location.origin}/orders/${orderId}`,
                fileName: file.name,
                uploadedBy: uploadedByName
              }
            });
          }
        }
      } catch (notifError) {
        console.error('❌ [Slack] Failed to send file upload notification:', notifError);
        // Don't fail the upload if Slack notification fails
      }

      return { success: true, attachment: data.attachment };

    } catch (error: unknown) {
      console.error('❌ File upload error:', error);
      return { success: false, error: error.message };
    }
  };

  // Upload multiple files with optional comment linking
  const uploadFiles = async (
    files: File[],
    uploadContext: string = 'comment',
    commentId?: string
  ): Promise<AttachmentUploadResult[]> => {
    if (files.length === 0) return [];

    setUploading(true);
    try {
      console.log(`📎 Uploading ${files.length} files...`, commentId ? `linked to comment ${commentId}` : '');

      const uploadPromises = files.map(file => uploadFile(file, uploadContext, commentId));
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
        toast({ description: `${successful} file(s) uploaded successfully` });
      }
      if (failed > 0) {
        toast({ variant: 'destructive', description: `${failed} file(s) failed to upload` });
      }

      return uploadResults;

    } catch (error: unknown) {
      console.error('❌ Bulk upload error:', error);
      toast({ variant: 'destructive', description: 'Failed to upload files' });
      return [];
    } finally {
      setUploading(false);
    }
  };

  // Upload selected files and clear selection with optional comment linking
  const uploadSelectedFiles = async (
    uploadContext: string = 'comment',
    commentId?: string
  ): Promise<AttachmentUploadResult[]> => {
    const results = await uploadFiles(selectedFiles, uploadContext, commentId);

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

  // Delete attachment from storage and database
  const deleteAttachment = useCallback(async (attachmentId: string, filePath: string): Promise<boolean> => {
    if (!user) {
      toast({ variant: 'destructive', description: 'User not authenticated' });
      return false;
    }

    try {
      console.log('🗑️ Deleting attachment:', attachmentId);

      // 1. Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('order-attachments')
        .remove([filePath]);

      if (storageError) {
        console.error('❌ Storage delete failed:', storageError);
        // Continue to delete DB record even if storage fails
      }

      // 2. Delete from database
      const { error: dbError } = await supabase
        .from('order_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) {
        console.error('❌ DB delete failed:', dbError);
        toast({ variant: 'destructive', description: 'Failed to delete attachment' });
        return false;
      }

      console.log('✅ Attachment deleted successfully');
      toast({ description: 'Attachment deleted successfully' });
      return true;

    } catch (error: unknown) {
      console.error('❌ Delete error:', error);
      toast({ variant: 'destructive', description: 'Failed to delete attachment' });
      return false;
    }
  }, [user]);

  // Validate file before adding
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip', 'application/x-zip-compressed'
    ];

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
      };
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed. Please use images, PDFs, Word documents, or text files.`
      };
    }

    return { valid: true };
  }, []);

  // Enhanced addFiles with validation
  const addFilesWithValidation = useCallback((newFiles: File[]) => {
    const MAX_FILES_PER_COMMENT = 5;

    // Check total file limit
    if (selectedFiles.length + newFiles.length > MAX_FILES_PER_COMMENT) {
      toast({ variant: 'destructive', description: `Maximum ${MAX_FILES_PER_COMMENT} files per comment` });
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of newFiles) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        toast({ variant: 'destructive', description: `${file.name}: ${validation.error}` });
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  }, [selectedFiles, validateFile]);

  return {
    selectedFiles,
    uploading,
    addFiles,
    addFilesWithValidation,
    removeFile,
    clearFiles,
    uploadFiles,
    uploadSelectedFiles,
    deleteAttachment,
    validateFile
  };
};
