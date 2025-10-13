import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FilePreview } from './FilePreview';
import { DragDropZone } from './DragDropZone';

interface FileSelectorProps {
  selectedFiles: File[];
  onFilesSelected: (files: File[]) => void;
  onFilesSelectedWithValidation?: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

export function FileSelector({
  selectedFiles,
  onFilesSelected,
  onFilesSelectedWithValidation,
  onRemoveFile,
  disabled = false,
  className
}: FileSelectorProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);

    // Use validation if available, otherwise fallback to regular
    if (onFilesSelectedWithValidation) {
      onFilesSelectedWithValidation(newFiles);
    } else {
      onFilesSelected(newFiles);
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file from selection
  const removeFile = (index: number) => {
    onRemoveFile(index);
  };

  // Handle files dropped
  const handleFilesDropped = (files: File[]) => {
    if (onFilesSelectedWithValidation) {
      onFilesSelectedWithValidation(files);
    } else {
      onFilesSelected(files);
    }
  };

  return (
    <DragDropZone
      onFilesDropped={handleFilesDropped}
      disabled={disabled}
      className={className}
    >
      <div>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip"
        />

        {/* File selection button */}
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

        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-muted-foreground">
              {t('attachments.selected_files', '{{count}} files selected', { count: selectedFiles.length })}
            </div>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <FilePreview
                  key={`${file.name}-${index}`}
                  file={file}
                  onRemove={() => removeFile(index)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DragDropZone>
  );
}