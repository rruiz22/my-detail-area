// =====================================================
// INVOICE TAGS DISPLAY (Read-Only)
// Created: 2024-12-04
// Description: Componente para mostrar tags en la lista
//              de invoices (solo lectura)
// =====================================================

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getTagColor } from '@/utils/tagColors';
import type { InvoiceTag } from '@/types/invoices';
import { useTranslation } from 'react-i18next';

interface InvoiceTagsDisplayProps {
  tags: InvoiceTag[];
  maxVisible?: number; // Número máximo de tags visibles antes de mostrar "+N more"
  size?: 'sm' | 'xs'; // Tamaño de los badges
  className?: string;
}

/**
 * Componente para mostrar tags de un invoice (read-only)
 * Se usa en la lista de invoices en InvoiceGroupAccordion
 *
 * Features:
 * - Muestra hasta maxVisible tags
 * - Si hay más, muestra "+N more" con tooltip de todos los tags
 * - Colores automáticos basados en colorIndex
 * - Soporte para diferentes tamaños
 *
 * @example
 * ```tsx
 * <InvoiceTagsDisplay
 *   tags={invoice.tags || []}
 *   maxVisible={3}
 *   size="xs"
 * />
 * ```
 */
export function InvoiceTagsDisplay({
  tags,
  maxVisible = 3,
  size = 'xs',
  className = '',
}: InvoiceTagsDisplayProps) {
  const { t } = useTranslation();

  // Si no hay tags, no renderizar nada
  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = Math.max(0, tags.length - maxVisible);
  const hasMoreTags = remainingCount > 0;

  // Clases de tamaño
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
  };

  return (
    <div className={`flex gap-1 mt-1 flex-wrap justify-center ${className}`}>
      {/* Tags visibles */}
      {visibleTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={`whitespace-nowrap ${getTagColor(tag.colorIndex)} ${sizeClasses[size]}`}
        >
          {tag.tagName}
        </Badge>
      ))}

      {/* Indicador "+N more" con tooltip */}
      {hasMoreTags && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={`whitespace-nowrap bg-gray-100 text-gray-600 cursor-help ${sizeClasses[size]}`}
              >
                +{remainingCount} {remainingCount === 1 ? 'more' : 'more'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="max-w-xs p-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t('reports.invoices.tags.all_tags', { defaultValue: 'All tags' })}:
                </p>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className={`text-[9px] whitespace-nowrap ${getTagColor(tag.colorIndex)}`}
                    >
                      {tag.tagName}
                    </Badge>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
