import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  onCancel?: () => void;
}

export function UploadProgress({
  fileName,
  progress,
  status,
  error,
  onCancel
}: UploadProgressProps) {
  const { t } = useTranslation();

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Loader2 className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'border-blue-200 bg-blue-50/50';
      case 'success':
        return 'border-emerald-200 bg-emerald-50/50';
      case 'error':
        return 'border-red-200 bg-red-50/50';
      default:
        return 'border-gray-200 bg-gray-50/50';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return t('attachments.upload_pending', 'Waiting...');
      case 'uploading':
        return t('attachments.uploading', 'Uploading...');
      case 'success':
        return t('attachments.upload_success', 'Uploaded');
      case 'error':
        return error || t('attachments.upload_failed', 'Failed');
      default:
        return '';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getStatusColor()} transition-colors`}>
      <div className="flex items-center gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium truncate">{fileName}</span>
            <Badge
              variant="outline"
              className={`text-xs ${
                status === 'success' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                status === 'error' ? 'bg-red-100 text-red-800 border-red-300' :
                status === 'uploading' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                'bg-gray-100 text-gray-800'
              }`}
            >
              {getStatusText()}
            </Badge>
          </div>

          {/* Progress Bar */}
          {status === 'uploading' && (
            <div className="space-y-1">
              <Progress value={progress} className="h-1" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progress}%</span>
                <span>{Math.round(progress / 100 * 100)}% complete</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {status === 'error' && error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>

        {/* Cancel Button */}
        {status === 'uploading' && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={onCancel}
            title={t('common.action_buttons.cancel', 'Cancel')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
