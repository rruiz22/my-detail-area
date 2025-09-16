import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type NotificationChannel = 'sms' | 'email' | 'push' | 'in_app';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type NotificationEventType = 'sent' | 'delivered' | 'read' | 'clicked' | 'failed' | 'bounced';

export interface NotificationData {
  title?: string;
  content?: string;
  message?: string;
  subject?: string;
  html?: string;
  body?: string;
  order_number?: string;
  status?: string;
  customer_name?: string;
  sender_name?: string;
  message_preview?: string;
  alert_title?: string;
  alert_message?: string;
  [key: string]: unknown;
}

export interface TemplateContent {
  title?: string;
  content?: string;
  subject?: string;
  html?: string;
  body?: string;
  [key: string]: unknown;
}

export interface IntegrationConfig {
  sms?: {
    provider: string;
    api_key?: string;
    webhook_url?: string;
  };
  email?: {
    provider: string;
    api_key?: string;
    from_address?: string;
  };
  push?: {
    provider: string;
    server_key?: string;
  };
  [key: string]: unknown;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  trigger: {
    event_type: string;
    entity_type?: string;
    conditions?: Record<string, unknown>;
  };
  actions: Array<{
    type: string;
    channel: NotificationChannel;
    template_id?: string;
    delay?: number;
  }>;
  is_active: boolean;
}

export interface AnalyticsRecord {
  dealer_id: number;
  user_id?: string;
  notification_id?: string;
  batch_id?: string;
  channel: string;
  event_type: string;
  notification_type: string;
  entity_type?: string;
  entity_id?: string;
  metadata: Record<string, unknown>;
  created_at?: string;
}

export interface ChannelHandler {
  send(notification: NotificationData, config?: IntegrationConfig): Promise<boolean>;
  validate?(config: IntegrationConfig): boolean;
}

export interface ChannelPreference {
  enabled: boolean;
  frequency: string;
}

export interface OrderData {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
}

export interface MessageData {
  id: string;
  sender_name: string;
  content: string;
}

export interface AlertData {
  title: string;
  message: string;
}

export interface NotificationRequest {
  dealerId: number;
  userId?: string;
  notificationType: string;
  entityType?: string;
  entityId?: string;
  channels: NotificationChannel[];
  templateId?: string;
  data: NotificationData;
  priority?: NotificationPriority;
  scheduledFor?: Date;
  batchId?: string;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  errors?: Array<{ channel: NotificationChannel; error: string }>;
  analytics?: {
    sent: number;
    failed: number;
    channels: NotificationChannel[];
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  dealer_id?: number;
  template_type: 'system' | 'custom' | 'module_specific';
  category: string;
  channels: Record<NotificationChannel, TemplateContent>;
  variables: Array<{ name: string; type: string; required?: boolean }>;
  is_active: boolean;
}

export interface DealerNotificationConfig {
  id: string;
  dealer_id: number;
  channels: Record<NotificationChannel, boolean>;
  rate_limits: Record<NotificationChannel, { per_hour: number; per_day: number }>;
  integrations: IntegrationConfig;
  workflows: WorkflowConfig[];
  templates: Record<string, TemplateContent>;
}

export interface UserNotificationPreferences {
  id: string;
  user_id: string;
  dealer_id: number;
  channel_preferences: Record<NotificationChannel, ChannelPreference>;
  entity_subscriptions: Record<string, { enabled: boolean; events: string[] }>;
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  priority_filters: Record<NotificationPriority, boolean>;
  notification_sound: {
    enabled: boolean;
    soundId: string;
  };
}

export class NotificationService {
  private static instance: NotificationService;
  private registeredChannels: Map<NotificationChannel, ChannelHandler> = new Map();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Channel Registration
  registerChannel(channel: NotificationChannel, handler: ChannelHandler) {
    this.registeredChannels.set(channel, handler);
  }

  getAvailableChannels(dealerId: number): NotificationChannel[] {
    return Array.from(this.registeredChannels.keys());
  }

  // Core Sending Methods
  async send(request: NotificationRequest): Promise<NotificationResult> {
    try {
      console.log('NotificationService: Sending notification', { request });

      // 1. Validate request
      if (!this.validateRequest(request)) {
        throw new Error('Invalid notification request');
      }

      // 2. Get user preferences and dealer config
      const [userPrefs, dealerConfig] = await Promise.all([
        this.getUserPreferences(request.userId || '', request.dealerId),
        this.getDealerConfig(request.dealerId)
      ]);

      // 3. Apply filtering logic
      const filteredChannels = this.applyFilters(request, userPrefs, dealerConfig);
      
      if (filteredChannels.length === 0) {
        return { success: true, analytics: { sent: 0, failed: 0, channels: [] } };
      }

      // 4. Check rate limits
      const rateLimitPassed = await this.checkRateLimits(request.dealerId, request.userId, filteredChannels);
      if (!rateLimitPassed) {
        throw new Error('Rate limit exceeded');
      }

      // 5. Queue or send immediately
      const result = await this.processNotification({
        ...request,
        channels: filteredChannels
      });

      // 6. Track analytics
      await this.trackAnalytics({
        dealerId: request.dealerId,
        userId: request.userId,
        notificationId: result.notificationId,
        channels: filteredChannels,
        eventType: 'sent',
        notificationType: request.notificationType,
        entityType: request.entityType,
        entityId: request.entityId,
        metadata: { success: result.success }
      });

      return result;

    } catch (error: unknown) {
      console.error('NotificationService: Send error', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.trackAnalytics({
        dealerId: request.dealerId,
        userId: request.userId,
        channels: request.channels,
        eventType: 'failed',
        notificationType: request.notificationType,
        metadata: { error: errorMessage }
      });

      return {
        success: false,
        errors: request.channels.map(channel => ({ channel, error: errorMessage }))
      };
    }
  }

  async sendBatch(requests: NotificationRequest[]): Promise<NotificationResult[]> {
    const batchId = crypto.randomUUID();
    
    return Promise.all(
      requests.map(request => 
        this.send({ ...request, batchId })
      )
    );
  }

  // Template System
  async getTemplates(dealerId: number, category?: string): Promise<NotificationTemplate[]> {
    try {
      let query = supabase
        .from('notification_templates')
        .select('*')
        .or(`dealer_id.eq.${dealerId},dealer_id.is.null`)
        .eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      return (data || []) as unknown as NotificationTemplate[];
    } catch (error: unknown) {
      console.error('NotificationService: Get templates error', error);
      return [];
    }
  }

  async renderTemplate(templateId: string, data: NotificationData): Promise<Record<NotificationChannel, TemplateContent>> {
    try {
      const { data: template, error } = await supabase
        .from('notification_templates')
        .select('channels')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      const rendered: Partial<Record<NotificationChannel, TemplateContent>> = {};
      
      if (template.channels && typeof template.channels === 'object') {
        for (const [channel, content] of Object.entries(template.channels)) {
          rendered[channel as NotificationChannel] = this.interpolateTemplate(content, data);
        }
      }

      return rendered as Record<NotificationChannel, TemplateContent>;
    } catch (error: unknown) {
      console.error('NotificationService: Render template error', error);
      return {} as Record<NotificationChannel, TemplateContent>;
    }
  }

  // Configuration Management
  async getDealerConfig(dealerId: number): Promise<DealerNotificationConfig | null> {
    try {
      const { data, error } = await supabase
        .from('dealer_notification_configs')
        .select('*')
        .eq('dealer_id', dealerId)
        .single();

      if (error) throw error;
      return data as unknown as DealerNotificationConfig;
    } catch (error: unknown) {
      console.error('NotificationService: Get dealer config error', error);
      return null;
    }
  }

  async getUserPreferences(userId: string, dealerId: number): Promise<UserNotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('dealer_id', dealerId)
        .single();

      if (error) throw error;
      return data as unknown as UserNotificationPreferences;
    } catch (error: unknown) {
      console.error('NotificationService: Get user preferences error', error);
      return null;
    }
  }

  async updateUserPreferences(
    userId: string, 
    dealerId: number, 
    preferences: Partial<UserNotificationPreferences>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          dealer_id: dealerId,
          ...preferences
        });

      if (error) throw error;
      return true;
    } catch (error: unknown) {
      console.error('NotificationService: Update user preferences error', error);
      return false;
    }
  }

  // Analytics
  async trackAnalytics(event: {
    dealerId: number;
    userId?: string;
    notificationId?: string;
    batchId?: string;
    channels: NotificationChannel[];
    eventType: NotificationEventType;
    notificationType: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const records = event.channels.map(channel => ({
        dealer_id: event.dealerId,
        user_id: event.userId,
        notification_id: event.notificationId,
        batch_id: event.batchId,
        channel,
        event_type: event.eventType,
        notification_type: event.notificationType,
        entity_type: event.entityType,
        entity_id: event.entityId,
        metadata: event.metadata || {}
      }));

      const { error } = await supabase
        .from('notification_analytics')
        .insert(records);

      if (error) throw error;
    } catch (error: unknown) {
      console.error('NotificationService: Track analytics error', error);
    }
  }

  async getAnalytics(dealerId: number, filters: {
    startDate?: Date;
    endDate?: Date;
    channel?: NotificationChannel;
    eventType?: NotificationEventType;
  } = {}): Promise<AnalyticsRecord[]> {
    try {
      let query = supabase
        .from('notification_analytics')
        .select('*')
        .eq('dealer_id', dealerId);

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      if (filters.channel) {
        query = query.eq('channel', filters.channel);
      }
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error: unknown) {
      console.error('NotificationService: Get analytics error', error);
      return [];
    }
  }

  // Private Helper Methods
  private validateRequest(request: NotificationRequest): boolean {
    return !!(
      request.dealerId &&
      request.notificationType &&
      request.channels &&
      request.channels.length > 0 &&
      request.data
    );
  }

  private applyFilters(
    request: NotificationRequest,
    userPrefs: UserNotificationPreferences | null,
    dealerConfig: DealerNotificationConfig | null
  ): NotificationChannel[] {
    if (!userPrefs || !dealerConfig) {
      return request.channels;
    }

    // Filter based on user preferences and dealer config
    return request.channels.filter(channel => {
      // Check if channel is enabled in dealer config
      if (!dealerConfig.channels || !dealerConfig.channels[channel]) {
        return false;
      }

      // Check if user has enabled this channel
      if (!userPrefs.channel_preferences || !userPrefs.channel_preferences[channel]?.enabled) {
        return false;
      }

      // Check priority filters
      if (request.priority && userPrefs.priority_filters && !userPrefs.priority_filters[request.priority]) {
        return false;
      }

      // Check quiet hours (simplified)
      const quietHours = userPrefs.quiet_hours;
      if (quietHours?.enabled) {
        const now = new Date();
        const currentHour = now.getHours();
        const quietStart = parseInt(quietHours.start.split(':')[0]);
        const quietEnd = parseInt(quietHours.end.split(':')[0]);
        
        if (currentHour >= quietStart || currentHour <= quietEnd) {
          // Only allow urgent/critical during quiet hours
          if (!request.priority || !['urgent', 'critical'].includes(request.priority)) {
            return false;
          }
        }
      }

      return true;
    });
  }

  private async checkRateLimits(
    dealerId: number,
    userId: string | undefined,
    channels: NotificationChannel[]
  ): Promise<boolean> {
    // Simplified rate limiting check
    // In production, this would check against notification_rate_limits table
    return true;
  }

  private async processNotification(request: NotificationRequest): Promise<NotificationResult> {
    // Add to queue for processing
    const { data, error } = await supabase
      .from('notification_queue')
      .insert({
        batch_id: request.batchId,
        user_id: request.userId || '',
        dealer_id: request.dealerId,
        notification_type: request.notificationType,
        entity_type: request.entityType,
        entity_id: request.entityId,
        channels: request.channels,
        notification_data: request.data,
        template_id: request.templateId,
        priority: request.priority || 'normal',
        scheduled_for: request.scheduledFor?.toISOString() || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to queue notification: ${error.message}`);
    }

    // For immediate notifications, call the edge function
    if (!request.scheduledFor || request.scheduledFor <= new Date()) {
      await supabase.functions.invoke('enhanced-notification-engine', {
        body: { notificationId: data.id }
      });
    }

    return {
      success: true,
      notificationId: data.id,
      analytics: {
        sent: request.channels.length,
        failed: 0,
        channels: request.channels
      }
    };
  }

  private interpolateTemplate(template: TemplateContent | string, data: NotificationData): TemplateContent | string {
    if (typeof template === 'string') {
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || match;
      });
    }

    if (typeof template === 'object' && template !== null) {
      const result: TemplateContent = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.interpolateTemplate(value, data);
      }
      return result;
    }

    return template;
  }

  // Quick notification methods for easy integration
  async notifyOrderUpdate(dealerId: number, userId: string, orderData: OrderData): Promise<void> {
    await this.send({
      dealerId,
      userId,
      notificationType: 'order_update',
      entityType: 'order',
      entityId: orderData.id,
      channels: ['in_app', 'push'],
      data: {
        order_number: orderData.order_number,
        status: orderData.status,
        customer_name: orderData.customer_name
      },
      priority: 'normal'
    });
  }

  async notifyNewMessage(dealerId: number, userId: string, messageData: MessageData): Promise<void> {
    await this.send({
      dealerId,
      userId,
      notificationType: 'new_message',
      entityType: 'message',
      entityId: messageData.id,
      channels: ['in_app', 'push'],
      data: {
        sender_name: messageData.sender_name,
        message_preview: messageData.content.substring(0, 100)
      },
      priority: 'high'
    });
  }

  async notifySystemAlert(dealerId: number, alertData: AlertData): Promise<void> {
    // Get all active users for this dealer
    const { data: users } = await supabase
      .from('dealer_memberships')
      .select('user_id')
      .eq('dealer_id', dealerId)
      .eq('is_active', true);

    if (users) {
      await this.sendBatch(
        users.map(user => ({
          dealerId,
          userId: user.user_id,
          notificationType: 'system_alert',
          entityType: 'system',
          channels: ['in_app', 'email'],
          data: {
            alert_title: alertData.title,
            alert_message: alertData.message
          },
          priority: 'urgent' as NotificationPriority
        }))
      );
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();