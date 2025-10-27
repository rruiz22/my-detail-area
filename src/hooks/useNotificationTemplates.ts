import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type {
  NotificationTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  Language,
  NotificationChannel,
} from '@/types/settings';

/**
 * Hook: useNotificationTemplates
 *
 * Manages CRUD operations for notification templates.
 *
 * FEATURES:
 * - List templates with dealer-specific filtering
 * - Create new templates with validation
 * - Update existing templates with versioning
 * - Delete templates with confirmation
 * - Optimistic updates with automatic rollback
 * - TanStack Query caching with automatic invalidation
 *
 * USAGE:
 * const {
 *   templates,
 *   isLoading,
 *   createTemplate,
 *   updateTemplate,
 *   deleteTemplate
 * } = useNotificationTemplates(dealerId);
 *
 * createTemplate({
 *   template_key: 'order_created',
 *   template_name: 'Order Created',
 *   language: 'en',
 *   channel_type: 'email',
 *   body: 'Your order {{order_id}} has been created'
 * });
 */

export interface UseNotificationTemplatesOptions {
  dealerId?: number | null; // null = global templates only
  language?: Language;
  channelType?: NotificationChannel;
  enabled?: boolean;
}

export function useNotificationTemplates(
  dealerId?: number | null,
  options: Omit<UseNotificationTemplatesOptions, 'dealerId'> = {}
) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { language, channelType, enabled = true } = options;

  // Fetch notification templates
  const {
    data: templates,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notification-templates', dealerId, language, channelType],
    queryFn: async () => {
      let query = supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by dealer (null for global templates)
      if (dealerId === null) {
        query = query.is('dealer_id', null).eq('is_global', true);
      } else if (dealerId !== undefined) {
        // Include both dealer-specific and global templates
        query = query.or(`dealer_id.eq.${dealerId},is_global.eq.true`);
      }

      // Additional filters
      if (language) {
        query = query.eq('language', language);
      }

      if (channelType) {
        query = query.eq('channel_type', channelType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Notification Templates] Query failed:', error);
        throw error;
      }

      return (data || []) as NotificationTemplate[];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const templateData = {
        template_key: input.template_key,
        template_name: input.template_name,
        description: input.description || null,
        dealer_id: input.dealer_id || null,
        is_global: input.is_global ?? false,
        language: input.language,
        channel_type: input.channel_type,
        subject: input.subject || null,
        body: input.body,
        html_body: input.html_body || null,
        variables: input.variables || [],
        preview_data: input.preview_data || {},
        enabled: input.enabled ?? true,
        version: 1,
        is_default: false,
      };

      const { data, error } = await supabase
        .from('notification_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) {
        console.error('[Notification Templates] Create failed:', error);
        throw error;
      }

      return data as NotificationTemplate;
    },
    onSuccess: (data) => {
      // Invalidate and refetch templates
      queryClient.invalidateQueries({
        queryKey: ['notification-templates'],
      });

      toast({
        title: t('settings.notifications.template_created'),
        description: t('settings.notifications.template_created_desc', {
          name: data.template_name,
        }),
      });
    },
    onError: (error: Error) => {
      console.error('[Notification Templates] Create error:', error);

      toast({
        title: t('settings.notifications.template_create_error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTemplateInput;
    }) => {
      // Increment version if body changes
      const versionIncrement =
        updates.body || updates.html_body ? { version: (updates.version || 1) + 1 } : {};

      const { data, error } = await supabase
        .from('notification_templates')
        .update({
          ...updates,
          ...versionIncrement,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[Notification Templates] Update failed:', error);
        throw error;
      }

      return data as NotificationTemplate;
    },
    // Optimistic update
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['notification-templates'],
      });

      // Snapshot previous value
      const previousTemplates = queryClient.getQueryData<NotificationTemplate[]>([
        'notification-templates',
        dealerId,
        language,
        channelType,
      ]);

      // Optimistically update cache
      queryClient.setQueryData<NotificationTemplate[]>(
        ['notification-templates', dealerId, language, channelType],
        (old) =>
          old?.map((template) =>
            template.id === id
              ? {
                  ...template,
                  ...updates,
                  updated_at: new Date().toISOString(),
                }
              : template
          ) || []
      );

      return { previousTemplates };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['notification-templates'],
      });

      toast({
        title: t('settings.notifications.template_updated'),
        description: t('settings.notifications.template_updated_desc', {
          name: data.template_name,
        }),
      });
    },
    onError: (error: Error, _variables, context) => {
      console.error('[Notification Templates] Update error:', error);

      // Rollback optimistic update
      if (context?.previousTemplates) {
        queryClient.setQueryData(
          ['notification-templates', dealerId, language, channelType],
          context.previousTemplates
        );
      }

      toast({
        title: t('settings.notifications.template_update_error'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['notification-templates'],
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Notification Templates] Delete failed:', error);
        throw error;
      }

      return id;
    },
    // Optimistic delete
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ['notification-templates'],
      });

      const previousTemplates = queryClient.getQueryData<NotificationTemplate[]>([
        'notification-templates',
        dealerId,
        language,
        channelType,
      ]);

      // Optimistically remove from cache
      queryClient.setQueryData<NotificationTemplate[]>(
        ['notification-templates', dealerId, language, channelType],
        (old) => old?.filter((template) => template.id !== id) || []
      );

      return { previousTemplates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notification-templates'],
      });

      toast({
        title: t('settings.notifications.template_deleted'),
        description: t('settings.notifications.template_deleted_desc'),
      });
    },
    onError: (error: Error, _id, context) => {
      console.error('[Notification Templates] Delete error:', error);

      // Rollback optimistic delete
      if (context?.previousTemplates) {
        queryClient.setQueryData(
          ['notification-templates', dealerId, language, channelType],
          context.previousTemplates
        );
      }

      toast({
        title: t('settings.notifications.template_delete_error'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['notification-templates'],
      });
    },
  });

  // Duplicate template helper
  const duplicateTemplate = async (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);

    if (!template) {
      toast({
        title: t('common.error'),
        description: t('settings.notifications.template_not_found'),
        variant: 'destructive',
      });
      return;
    }

    const duplicatedTemplate: CreateTemplateInput = {
      template_key: `${template.template_key}_copy`,
      template_name: `${template.template_name} (Copy)`,
      description: template.description || undefined,
      dealer_id: template.dealer_id || undefined,
      is_global: false, // Copies are never global
      language: template.language,
      channel_type: template.channel_type,
      subject: template.subject || undefined,
      body: template.body,
      html_body: template.html_body || undefined,
      variables: template.variables,
      preview_data: template.preview_data,
      enabled: false, // Start disabled
    };

    createTemplateMutation.mutate(duplicatedTemplate);
  };

  return {
    templates: templates || [],
    isLoading,
    error,
    refetch,
    createTemplate: createTemplateMutation.mutate,
    createTemplateAsync: createTemplateMutation.mutateAsync,
    isCreating: createTemplateMutation.isPending,
    updateTemplate: updateTemplateMutation.mutate,
    updateTemplateAsync: updateTemplateMutation.mutateAsync,
    isUpdating: updateTemplateMutation.isPending,
    deleteTemplate: deleteTemplateMutation.mutate,
    deleteTemplateAsync: deleteTemplateMutation.mutateAsync,
    isDeleting: deleteTemplateMutation.isPending,
    duplicateTemplate,
  };
}

/**
 * Hook: useNotificationTemplate (single template)
 *
 * Fetches a single notification template by ID.
 *
 * USAGE:
 * const { template, isLoading } = useNotificationTemplate(templateId);
 */
export function useNotificationTemplate(templateId: string | undefined) {
  const { data: template, isLoading, error } = useQuery({
    queryKey: ['notification-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        console.error('[Notification Template] Query failed:', error);
        throw error;
      }

      return data as NotificationTemplate;
    },
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    template,
    isLoading,
    error,
  };
}
