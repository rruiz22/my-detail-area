import React, { useCallback, useState } from 'react';
import { Upload, FileUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface DragDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  acceptedTypes?: string;
}

export function DragDropZone({
  onFilesDropped,
  disabled = false,
  children,
  className,
  acceptedTypes = 'image/*,.pdf,.doc,.docx,.txt,.zip'
}: DragDropZoneProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Handle drag enter
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [disabled]);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  }, [disabled]);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    e.dataTransfer.dropEffect = 'copy';
  }, [disabled]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    setIsDragging(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesDropped(files);
    }
  }, [disabled, onFilesDropped]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'relative rounded-lg transition-all duration-200',
        isDragging && !disabled && 'ring-2 ring-blue-500 ring-offset-2',
        className
      )}
    >
      {children}

      {/* Drag Overlay */}
      {isDragging && !disabled && (
        <div className="absolute inset-0 bg-blue-50/90 border-2 border-dashed border-blue-500 rounded-lg flex flex-col items-center justify-center z-10 pointer-events-none">
          <FileUp className="h-12 w-12 text-blue-600 mb-2 animate-bounce" />
          <p className="text-sm font-medium text-blue-700">
            {t('attachments.drop_files_here', 'Drop files here')}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {t('attachments.supported_types', 'Images, PDFs, Documents, ZIP files')}
          </p>
        </div>
      )}
    </div>
  );
}
