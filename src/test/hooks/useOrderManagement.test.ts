import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOrderManagement } from '@/hooks/useOrderManagement';
import { mockOrder } from '../utils/test-utils';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [mockOrder],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockOrder,
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockOrder,
              error: null,
            })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
  },
}));

describe('useOrderManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useOrderManagement('all'));
    
    expect(result.current.orders).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.tabCounts).toBeDefined();
  });

  it('should handle filter updates', async () => {
    const { result } = renderHook(() => useOrderManagement('all'));
    
    // Wait for initial loading to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    result.current.updateFilters({ search: 'Toyota' });
    
    expect(result.current.filters.search).toBe('Toyota');
  });
});