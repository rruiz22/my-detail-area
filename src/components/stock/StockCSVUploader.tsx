import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useStockManagement } from '@/hooks/useStockManagement';
import {
    AlertCircle,
    CheckCircle,
    Download,
    FileText,
    Play,
    Trash2,
    Upload,
    X
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  preview?: any[];
  metadata?: {
    separator?: string;
    timestamp?: Date | null;
  };
  result?: any;
}

interface StockCSVUploaderProps {
  dealerId?: number;
}

export const StockCSVUploader: React.FC<StockCSVUploaderProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { uploadCSV, loading } = useStockManagement();
  const { hasModulePermission } = usePermissions();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const canUpload = hasModulePermission('stock', 'add_vehicles');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}`,
      status: 'pending',
      progress: 0
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);

    // Auto-preview first file
    if (newFiles.length > 0) {
      previewFile(newFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.csv']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const previewFile = async (uploadFile: UploadFile) => {
    try {
      const text = await uploadFile.file.text();
      const { detectSeparator, extractFileTimestamp } = await import('@/utils/csvUtils');

      // Detect separator and use it for consistent parsing
      const separator = detectSeparator(text);
      const timestamp = extractFileTimestamp(uploadFile.file.name);

      const lines = text.split('\n').filter(line => line.trim()).slice(0, 6);
      const preview = lines.map(line => line.split(separator));

      console.log(`📋 Preview for ${uploadFile.file.name}:`, {
        separator: `"${separator}"`,
        timestamp,
        columns: preview[0]?.length || 0,
        rows: preview.length - 1
      });

      setUploadFiles(prev =>
        prev.map(f => f.id === uploadFile.id ? {
          ...f,
          preview,
          metadata: { separator, timestamp }
        } : f)
      );
    } catch (error) {
      console.error('Error previewing file:', error);
    }
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev =>
        prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f)
      );

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadFiles(prev =>
          prev.map(f => {
            if (f.id === uploadFile.id && f.progress < 90) {
              return { ...f, progress: f.progress + 10 };
            }
            return f;
          })
        );
      }, 200);

      const result = await uploadCSV(uploadFile.file);

      clearInterval(progressInterval);

      if (result.success) {
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id
              ? { ...f, status: 'success', progress: 100, result }
              : f
          )
        );

        toast({
          title: t('stock.upload.success'),
          description: result.details ?
            `${result.message}. Separator: "${result.details.separator}"` :
            result.message,
        });
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'error',
                progress: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            : f
        )
      );

      toast({
        title: t('stock.upload.error'),
        description: error instanceof Error ? error.message : t('stock.upload.error_message'),
        variant: "destructive",
      });
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending' || f.status === 'error');

    for (const file of pendingFiles) {
      await uploadFile(file);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'uploading':
        return <Upload className="w-4 h-4 text-primary animate-pulse" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>{t('stock.upload.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${!canUpload
                ? 'cursor-not-allowed opacity-50'
                : isDragActive
                  ? 'cursor-pointer border-primary bg-primary/5'
                  : 'cursor-pointer border-muted-foreground/25 hover:border-primary/50'
              }
            `}
          >
            <input {...getInputProps()} disabled={!canUpload} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {!canUpload ? (
              <div className="space-y-2">
                <p className="text-lg font-medium text-destructive">{t('errors.no_permission')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('errors.no_permission_upload')}
                </p>
              </div>
            ) : isDragActive ? (
              <p className="text-lg font-medium">{t('stock.upload.drop_files')}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">{t('stock.upload.drag_drop_files')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('stock.upload.supported_formats')}
                </p>
                <Button variant="outline" className="mt-4">
                  {t('stock.upload.browse_files')}
                </Button>
              </div>
            )}
          </div>

          {/* Sample CSV Download */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{t('stock.upload.sample_csv')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('stock.upload.sample_csv_description')}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              {t('stock.upload.download_sample')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('stock.upload.files_to_upload')}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadFiles([])}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('stock.upload.clear_all')}
                </Button>
                <Button
                  size="sm"
                  onClick={uploadAllFiles}
                  disabled={!canUpload || loading || uploadFiles.every(f => f.status === 'success')}
                  title={!canUpload ? t('errors.no_permission_create') : ''}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {t('stock.upload.upload_all')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3 flex-1">
                    {getStatusIcon(uploadFile.status)}
                    <div className="flex-1">
                      <p className="font-medium">{uploadFile.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {uploadFile.status === 'uploading' && (
                        <Progress value={uploadFile.progress} className="mt-2 h-2" />
                      )}
                      {uploadFile.error && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{uploadFile.error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      uploadFile.status === 'success' ? 'default' :
                      uploadFile.status === 'error' ? 'destructive' :
                      uploadFile.status === 'uploading' ? 'outline' : 'secondary'
                    }>
                      {t(`stock.upload.status.${uploadFile.status}`)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* File Preview with Debug Info */}
                {uploadFile.preview && (
                  <div className="ml-7 space-y-3">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium">{t('stock.upload.preview')}:</p>
                        <div className="flex gap-2 text-xs">
                          {uploadFile.metadata?.separator && (
                            <Badge variant="outline">
                              Sep: "{uploadFile.metadata.separator}"
                            </Badge>
                          )}
                          {uploadFile.metadata?.timestamp && (
                            <Badge variant="outline">
                              {uploadFile.metadata.timestamp.toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-mono space-y-1">
                        {uploadFile.preview.slice(0, 3).map((row, index) => (
                          <div key={index} className="truncate">
                            {row.slice(0, 6).join(' | ')}
                            {row.length > 6 && ' | ...'}
                          </div>
                        ))}
                        {uploadFile.preview.length > 3 && (
                          <div className="text-muted-foreground">
                            ... {t('stock.upload.more_rows', { count: uploadFile.preview.length - 3 })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Processing Results */}
                    {uploadFile.result?.details && (
                      <div className="p-4 bg-muted/20 rounded-lg">
                        <p className="text-sm font-medium mb-2">Processing Details:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>Processed: {uploadFile.result.details.processed}</div>
                          <div>Valid: {uploadFile.result.details.valid}</div>
                          <div>Invalid: {uploadFile.result.details.invalid}</div>
                          <div>Separator: &quot;{uploadFile.result.details.separator}&quot;</div>
                        </div>
                        {uploadFile.result.details.mappedColumns && (
                          <div className="mt-2">
                            <p className="text-xs font-medium">Mapped Columns:</p>
                            <div className="text-xs text-muted-foreground">
                              {Object.entries(uploadFile.result.details.mappedColumns).map(([field, column]) => (
                                <div key={field}>{field} ← {String(column)}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
