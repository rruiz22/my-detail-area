import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pushNotificationHelper, PushNotificationHelper } from './pushNotificationHelper';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('PushNotificationHelper', () => {
  let helper: PushNotificationHelper;

  beforeEach(() => {
    helper = new PushNotificationHelper();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const mockResponse = {
        success: true,
        sent: 1,
        failed: 0,
        tokens: ['token-123'],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await helper.sendNotification({
        userId: 'user-123',
        dealerId: 5,
        title: 'Test Title',
        body: 'Test Body',
      });

      expect(result.success).toBe(true);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.tokens).toEqual(['token-123']);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-notification', {
        body: {
          userId: 'user-123',
          dealerId: 5,
          title: 'Test Title',
          body: 'Test Body',
        },
      });
    });

    it('should handle edge function errors gracefully', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('Edge Function error'),
      });

      const result = await helper.sendNotification({
        userId: 'user-123',
        dealerId: 5,
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle missing data response', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await helper.sendNotification({
        userId: 'user-123',
        dealerId: 5,
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No data returned from notification service');
    });

    it('should include optional parameters in request', async () => {
      const mockResponse = {
        success: true,
        sent: 1,
        failed: 0,
        tokens: ['token-123'],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      await helper.sendNotification({
        userId: 'user-123',
        dealerId: 5,
        title: 'Test',
        body: 'Test',
        url: '/orders/123',
        data: { orderId: '123', type: 'test' },
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-notification', {
        body: {
          userId: 'user-123',
          dealerId: 5,
          title: 'Test',
          body: 'Test',
          url: '/orders/123',
          data: { orderId: '123', type: 'test' },
        },
      });
    });
  });

  describe('notifyOrderFollowers', () => {
    it('should notify all active followers', async () => {
      const mockFollowers = [
        { user_id: 'user-1', dealer_id: 5, notification_level: 'all' },
        { user_id: 'user-2', dealer_id: 5, notification_level: 'all' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockNeq = vi.fn().mockResolvedValue({
        data: mockFollowers,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        neq: mockNeq,
      } as any);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          sent: 1,
          failed: 0,
          tokens: ['token'],
        },
        error: null,
      });

      const result = await helper.notifyOrderFollowers(
        'order-123',
        'Test Title',
        'Test Body'
      );

      expect(supabase.from).toHaveBeenCalledWith('entity_followers');
      expect(mockSelect).toHaveBeenCalledWith('user_id, notification_level, dealer_id');
      expect(result.success).toBe(true);
      expect(result.sent).toBe(2); // Two followers
    });

    it('should handle no followers gracefully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockNeq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        neq: mockNeq,
      } as any);

      const result = await helper.notifyOrderFollowers(
        'order-123',
        'Test',
        'Test'
      );

      expect(result.success).toBe(true);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should filter by notification level when specified', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockNeq = vi.fn().mockReturnThis();

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        neq: mockNeq,
      } as any);

      mockNeq.mockResolvedValue({
        data: [],
        error: null,
      });

      await helper.notifyOrderFollowers('order-123', 'Test', 'Test', {
        notificationLevel: 'important',
      });

      // Should be called multiple times including the notification level filter
      expect(mockEq).toHaveBeenCalledWith('notification_level', 'important');
    });

    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockNeq = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        neq: mockNeq,
      } as any);

      const result = await helper.notifyOrderFollowers(
        'order-123',
        'Test',
        'Test'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('notifyDealerMembers', () => {
    it('should notify all dealer members', async () => {
      const mockMembers = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
        { user_id: 'user-3' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: mockMembers,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      } as any);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          sent: 1,
          failed: 0,
          tokens: ['token'],
        },
        error: null,
      });

      const result = await helper.notifyDealerMembers(
        5,
        'Test Title',
        'Test Body'
      );

      expect(supabase.from).toHaveBeenCalledWith('dealer_memberships');
      expect(result.success).toBe(true);
      expect(result.sent).toBe(3); // Three members
    });

    it('should handle no members gracefully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      } as any);

      const result = await helper.notifyDealerMembers(5, 'Test', 'Test');

      expect(result.success).toBe(true);
      expect(result.sent).toBe(0);
    });
  });

  describe('notifyOrderStatusChange', () => {
    it('should format and send status change notification', async () => {
      const mockFollowers = [
        { user_id: 'user-1', dealer_id: 5, notification_level: 'all' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockNeq = vi.fn().mockResolvedValue({
        data: mockFollowers,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        neq: mockNeq,
      } as any);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          sent: 1,
          failed: 0,
          tokens: ['token'],
        },
        error: null,
      });

      await helper.notifyOrderStatusChange(
        'order-123',
        'ABC123',
        'In Progress',
        'John Doe'
      );

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            title: 'Order ABC123 Status Updated',
            body: 'John Doe changed status to In Progress',
            url: '/orders/order-123',
            data: expect.objectContaining({
              orderNumber: 'ABC123',
              newStatus: 'In Progress',
              changedBy: 'John Doe',
              notificationType: 'status_change',
            }),
          }),
        })
      );
    });

    it('should not throw on error', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Database error');
      });

      // Should not throw
      await expect(
        helper.notifyOrderStatusChange('123', 'ABC', 'Status', 'User')
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyNewComment', () => {
    it('should format and send new comment notification', async () => {
      const mockFollowers = [
        { user_id: 'user-1', dealer_id: 5, notification_level: 'all' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockNeq = vi.fn().mockResolvedValue({
        data: mockFollowers,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        neq: mockNeq,
      } as any);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          sent: 1,
          failed: 0,
          tokens: ['token'],
        },
        error: null,
      });

      await helper.notifyNewComment(
        'order-123',
        'ABC123',
        'Jane Smith',
        'This is a comment'
      );

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            title: 'New Comment on Order ABC123',
            body: 'Jane Smith: This is a comment',
            url: '/orders/order-123?tab=comments',
            data: expect.objectContaining({
              commenterName: 'Jane Smith',
              notificationType: 'new_comment',
            }),
          }),
        })
      );
    });

    it('should truncate long comments', async () => {
      const longComment = 'A'.repeat(150);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockNeq = vi.fn().mockResolvedValue({
        data: [{ user_id: 'user-1', dealer_id: 5, notification_level: 'all' }],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        neq: mockNeq,
      } as any);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          sent: 1,
          failed: 0,
          tokens: ['token'],
        },
        error: null,
      });

      await helper.notifyNewComment('order-123', 'ABC123', 'User', longComment);

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            body: expect.stringContaining('...'),
          }),
        })
      );
    });
  });

  describe('notifyNewAttachment', () => {
    it('should format and send new attachment notification', async () => {
      const mockFollowers = [
        { user_id: 'user-1', dealer_id: 5, notification_level: 'all' },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockNeq = vi.fn().mockResolvedValue({
        data: mockFollowers,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        neq: mockNeq,
      } as any);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          sent: 1,
          failed: 0,
          tokens: ['token'],
        },
        error: null,
      });

      await helper.notifyNewAttachment(
        'order-123',
        'ABC123',
        'Mike Johnson',
        'report.pdf'
      );

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            title: 'New Attachment on Order ABC123',
            body: 'Mike Johnson uploaded report.pdf',
            url: '/orders/order-123?tab=attachments',
            data: expect.objectContaining({
              fileName: 'report.pdf',
              notificationType: 'new_attachment',
            }),
          }),
        })
      );
    });
  });

  describe('notifyOrderAssignment', () => {
    it('should send assignment notification to specific user', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          sent: 1,
          failed: 0,
          tokens: ['token'],
        },
        error: null,
      });

      await helper.notifyOrderAssignment(
        'user-123',
        5,
        'order-456',
        'ABC123',
        'Manager Smith'
      );

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            userId: 'user-123',
            dealerId: 5,
            title: 'Assigned to Order ABC123',
            body: 'Manager Smith assigned you to this order',
            url: '/orders/order-456',
            data: expect.objectContaining({
              assignedBy: 'Manager Smith',
              notificationType: 'order_assignment',
            }),
          }),
        })
      );
    });
  });

  describe('Singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(pushNotificationHelper).toBeInstanceOf(PushNotificationHelper);
    });
  });

  describe('Error resilience', () => {
    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue(
        new Error('Network error')
      );

      const result = await helper.sendNotification({
        userId: 'user-123',
        dealerId: 5,
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network error');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue('String error');

      const result = await helper.sendNotification({
        userId: 'user-123',
        dealerId: 5,
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unknown error occurred');
    });
  });
});
