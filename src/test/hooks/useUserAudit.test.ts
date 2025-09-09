import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserAudit } from '@/hooks/useUserAudit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({
                data: [
                  {
                    id: '1',
                    event_type: 'user_created',
                    entity_type: 'user',
                    entity_id: 'user-123',
                    user_id: 'admin-123',
                    metadata: { name: 'John Doe' },
                    ip_address: '192.168.1.1',
                    user_agent: 'Mozilla/5.0',
                    created_at: '2024-01-01T10:00:00Z',
                    profiles: { email: 'admin@test.com' },
                    affected_profiles: { email: 'john@test.com' }
                  }
                ],
                error: null,
                count: 1
              }))
            }))
          }))
        }))
      }))
    }))
  })),
  channel: vi.fn(() => ({
    on: vi.fn(() => ({
      subscribe: vi.fn()
    })),
    unsubscribe: vi.fn()
  }))
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useUserAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches audit events successfully', async () => {
    const { result } = renderHook(() => useUserAudit(5), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.auditEvents).toHaveLength(1);
    expect(result.current.auditEvents[0]).toMatchObject({
      id: '1',
      event_type: 'user_created',
      entity_type: 'user',
      user_email: 'admin@test.com',
      affected_user_email: 'john@test.com'
    });
  });

  it('handles pagination correctly', async () => {
    const { result } = renderHook(() => useUserAudit(5), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pagination).toMatchObject({
      page: 1,
      limit: 50,
      total: 1
    });
  });

  it('applies filters correctly', async () => {
    const { result } = renderHook(() => useUserAudit(5), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Test fetchAuditEvents with filters
    await result.current.fetchAuditEvents({
      eventType: 'user_created',
      entityType: 'user'
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('user_audit_log');
  });

  it('logs audit events correctly', async () => {
    const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          }))
        }))
      }))
    });

    const { result } = renderHook(() => useUserAudit(5), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.logAuditEvent({
      event_type: 'user_updated',
      entity_type: 'user',
      entity_id: 'user-456',
      user_id: 'admin-123',
      metadata: { field: 'email' }
    });

    expect(mockInsert).toHaveBeenCalledWith({
      event_type: 'user_updated',
      entity_type: 'user',
      entity_id: 'user-456',
      user_id: 'admin-123',
      metadata: { field: 'email' },
      ip_address: undefined,
      user_agent: undefined,
      dealer_id: 5
    });
  });

  it('exports audit log correctly', async () => {
    const mockCreateElement = vi.fn(() => ({
      href: '',
      download: '',
      click: vi.fn()
    }));
    const mockCreateObjectURL = vi.fn(() => 'blob:url');
    const mockRevokeObjectURL = vi.fn();

    global.document.createElement = mockCreateElement;
    global.window.URL = {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL
    } as any;

    const { result } = renderHook(() => useUserAudit(5), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.exportAuditLog({
      eventType: 'user_created'
    });

    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const mockError = new Error('Database error');
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: null, error: mockError, count: 0 }))
          }))
        }))
      }))
    });

    const { result } = renderHook(() => useUserAudit(5), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.auditEvents).toEqual([]);
  });

  it('updates pagination state correctly', async () => {
    const { result } = renderHook(() => useUserAudit(5), {
      wrapper: TestWrapper
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.setPagination({
      page: 2,
      limit: 25,
      total: 100
    });

    expect(result.current.pagination.page).toBe(2);
    expect(result.current.pagination.limit).toBe(25);
    expect(result.current.pagination.total).toBe(100);
  });
});