// =====================================================
// INVOICE TAGS MANAGER (Editable)
// Created: 2024-12-04
// Description: Componente para gestionar tags en el modal
//              del invoice (agregar/eliminar con autocompletado)
// =====================================================

import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { X, Plus, Tag } from 'lucide-react';
import { getTagColor } from '@/utils/tagColors';
import { useInvoiceTags, useSuggestedTags, useUpdateInvoiceTags } from '@/hooks/useInvoiceTags';
import type { Invoice, InvoiceTag } from '@/types/invoices';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface InvoiceTagsManagerProps {
  invoice: Invoice;
  dealerId: number;
  className?: string;
}

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

/**
 * Componente para gestionar tags de un invoice (editable)
 * Se usa en el header del InvoiceDetailsDialog
 *
 * Features:
 * - Agregar tags con input y autocompletado
 * - Sugerencias de tags más usados
 * - Eliminar tags con botón X
 * - Validaciones (max 10 tags, max 30 caracteres)
 * - Estado local optimista mientras se actualiza
 *
 * @example
 * ```tsx
 * <InvoiceTagsManager
 *   invoice={invoice}
 *   dealerId={invoice.dealerId}
 * />
 * ```
 */
export function InvoiceTagsManager({
  invoice,
  dealerId,
  className = '',
}: InvoiceTagsManagerProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: currentTags = [], isLoading: loadingTags } = useInvoiceTags(invoice.id);
  const { data: suggestedTags = [] } = useSuggestedTags(dealerId, { limit: 10 });

  // Mutation
  const updateTagsMutation = useUpdateInvoiceTags();

  // Estado local optimista
  const [optimisticTags, setOptimisticTags] = useState<InvoiceTag[]>([]);
  const previousTagsRef = useRef<string>('');

  // Sincronizar con datos del servidor cuando cambian (sin loop infinito)
  useEffect(() => {
    if (!loadingTags && currentTags) {
      // Usar ref para comparación sin causar re-renders
      const currentTagsKey = JSON.stringify(currentTags.map(t => t.id).sort());

      if (previousTagsRef.current !== currentTagsKey) {
        previousTagsRef.current = currentTagsKey;
        setOptimisticTags(currentTags);
      }
    }
  }, [currentTags, loadingTags]);

  // Filtrar sugerencias (excluir tags ya agregados)
  const currentTagNames = optimisticTags.map(t => t.tagName.toLowerCase());
  const filteredSuggestions = suggestedTags.filter(
    tag => !currentTagNames.includes(tag.tagName.toLowerCase())
  );

  // Filtrar sugerencias por input
  const matchedSuggestions = inputValue.trim()
    ? filteredSuggestions.filter(tag =>
        tag.tagName.toLowerCase().includes(inputValue.toLowerCase())
      )
    : filteredSuggestions;

  // Verificar si el input actual es un tag nuevo
  const isNewTag = inputValue.trim() &&
    !matchedSuggestions.some(t => t.tagName.toLowerCase() === inputValue.toLowerCase());

  // Agregar tag
  const handleAddTag = async (tagName: string) => {
    const trimmedName = tagName.trim();

    // Validaciones
    if (!trimmedName) return;

    if (optimisticTags.length >= MAX_TAGS) {
      return; // Ya se muestra error en UI
    }

    if (trimmedName.length > MAX_TAG_LENGTH) {
      return; // Ya se muestra error en UI
    }

    if (currentTagNames.includes(trimmedName.toLowerCase())) {
      return; // Tag duplicado
    }

    // Actualización optimista
    const newTag: InvoiceTag = {
      id: `temp-${Date.now()}`, // ID temporal
      tagName: trimmedName,
      colorIndex: Math.floor(Math.random() * 10),
    };
    setOptimisticTags(prev => [...prev, newTag]);

    // Actualizar en servidor
    const newTagNames = [...currentTags.map(t => t.tagName), trimmedName];
    await updateTagsMutation.mutateAsync({
      invoiceId: invoice.id,
      dealerId,
      tagNames: newTagNames,
    });

    // Limpiar input
    setInputValue('');
    setIsOpen(false);
  };

  // Eliminar tag
  const handleRemoveTag = async (tagToRemove: InvoiceTag) => {
    // Actualización optimista
    setOptimisticTags(prev => prev.filter(t => t.id !== tagToRemove.id));

    // Actualizar en servidor
    const newTagNames = currentTags
      .filter(t => t.id !== tagToRemove.id)
      .map(t => t.tagName);

    await updateTagsMutation.mutateAsync({
      invoiceId: invoice.id,
      dealerId,
      tagNames: newTagNames,
    });
  };

  // Manejar Enter en input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  const isMaxTagsReached = optimisticTags.length >= MAX_TAGS;
  const isInputTooLong = inputValue.length > MAX_TAG_LENGTH;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Tags actuales */}
      {optimisticTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {optimisticTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className={`${getTagColor(tag.colorIndex)} pr-1 text-xs`}
            >
              {tag.tagName}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1.5 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                aria-label={t('reports.invoices.tags.remove', { defaultValue: 'Remove tag' })}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Botón/Input para agregar tags */}
      {!isMaxTagsReached && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs border-dashed"
              disabled={updateTagsMutation.isPending}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('reports.invoices.tags.add_tag', { defaultValue: 'Add Tag' })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput
                ref={inputRef}
                placeholder={t('reports.invoices.tags.placeholder', {
                  defaultValue: 'Type to create or select...'
                })}
                value={inputValue}
                onValueChange={setInputValue}
                onKeyDown={handleKeyDown}
              />
              <CommandList>
                {/* Opción para crear tag nuevo */}
                {isNewTag && (
                  <CommandGroup heading={t('reports.invoices.tags.create_new', { defaultValue: 'Create new' })}>
                    <CommandItem
                      onSelect={() => handleAddTag(inputValue)}
                      className="cursor-pointer"
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      <span className="font-medium">"{inputValue}"</span>
                    </CommandItem>
                  </CommandGroup>
                )}

                {/* Sugerencias de tags existentes */}
                {matchedSuggestions.length > 0 && (
                  <CommandGroup heading={t('reports.invoices.tags.suggested', { defaultValue: 'Suggested tags' })}>
                    {matchedSuggestions.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => handleAddTag(tag.tagName)}
                        className="cursor-pointer"
                      >
                        <Badge
                          variant="outline"
                          className={`${getTagColor(tag.colorIndex)} text-xs mr-2`}
                        >
                          {tag.tagName}
                        </Badge>
                        {tag.usageCount !== undefined && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            ({tag.usageCount})
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Empty state */}
                {matchedSuggestions.length === 0 && !isNewTag && (
                  <CommandEmpty>
                    {t('reports.invoices.tags.no_tags', { defaultValue: 'No tags found. Type to create new.' })}
                  </CommandEmpty>
                )}
              </CommandList>
            </Command>

            {/* Mensajes de validación */}
            <div className="px-2 py-1.5 border-t text-xs text-muted-foreground">
              {isInputTooLong && (
                <p className="text-red-600">
                  {t('reports.invoices.tags.max_length', {
                    defaultValue: 'Tag name too long (max 30 characters)',
                  })}
                </p>
              )}
              {optimisticTags.length > 0 && (
                <p>
                  {optimisticTags.length}/{MAX_TAGS} {t('reports.invoices.tags.tags_used', { defaultValue: 'tags used' })}
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Indicador de max tags reached */}
      {isMaxTagsReached && (
        <span className="text-xs text-muted-foreground">
          {t('reports.invoices.tags.max_tags_reached', {
            defaultValue: 'Maximum 10 tags reached'
          })}
        </span>
      )}
    </div>
  );
}
