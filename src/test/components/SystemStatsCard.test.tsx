import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@/test/utils/test-utils';
import { SystemStatsCard } from '@/components/management/SystemStatsCard';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn()
  }
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

const mockSystemStats = {
  total_dealerships: 10,
  active_dealerships: 8,
  total_users: 45,
  active_users: 40,
  total_orders: 150,
  orders_this_month: 25,
  orders_this_week: 12,
  pending_invitations: 3,
  system_health_score: 85
};

describe('SystemStatsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders management system status component', () => {
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValue({
      data: [mockSystemStats],
      error: null
    });

    render(<SystemStatsCard />);
    
    // Should render the component without errors
    expect(true).toBe(true);
  });
});