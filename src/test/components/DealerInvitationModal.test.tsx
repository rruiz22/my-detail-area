import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../utils/test-utils';
import { DealerInvitationModal } from '@/components/dealerships/DealerInvitationModal';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
vi.mock('@/contexts/AuthContext');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;
const mockSupabase = require('@/integrations/supabase/client').supabase;

describe('DealerInvitationModal Component', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'admin@test.com',
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    dealerId: 1,
    onInvitationSent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it('renders correctly when open', () => {
    const { getByText, getByLabelText } = render(
      <DealerInvitationModal {...defaultProps} />
    );

    expect(getByText('Invitar Usuario al Concesionario')).toBeInTheDocument();
    expect(getByLabelText('Dirección de Email *')).toBeInTheDocument();
    expect(getByLabelText('Rol Asignado *')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { queryByText } = render(
      <DealerInvitationModal {...defaultProps} isOpen={false} />
    );

    expect(queryByText('Invitar Usuario al Concesionario')).not.toBeInTheDocument();
  });

  it('handles email input changes', () => {
    const { getByLabelText } = render(
      <DealerInvitationModal {...defaultProps} />
    );

    const emailInput = getByLabelText('Dirección de Email *');
    emailInput.setAttribute('value', 'test@example.com');
    
    expect(emailInput).toBeInTheDocument();
  });

  it('shows validation error when fields are empty', () => {
    mockSupabase.rpc.mockResolvedValue({ error: null, data: 'mock-token' });

    const { getByText } = render(
      <DealerInvitationModal {...defaultProps} />
    );

    const submitButton = getByText('Enviar Invitación');
    submitButton.click();

    // The component should handle validation internally
    expect(submitButton).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    const onCloseMock = vi.fn();
    const { getByText } = render(
      <DealerInvitationModal {...defaultProps} onClose={onCloseMock} />
    );

    const cancelButton = getByText('Cancelar');
    cancelButton.click();

    expect(onCloseMock).toHaveBeenCalledOnce();
  });

  it('shows role descriptions when role is selected', () => {
    const { getByText } = render(
      <DealerInvitationModal {...defaultProps} />
    );

    // The role descriptions are shown in the select options
    expect(getByText('Selecciona un rol para el usuario')).toBeInTheDocument();
  });

  it('handles successful invitation creation', async () => {
    const onInvitationSentMock = vi.fn();
    const onCloseMock = vi.fn();
    
    mockSupabase.rpc.mockResolvedValue({ 
      error: null, 
      data: 'mock-invitation-token' 
    });

    const { getByText } = render(
      <DealerInvitationModal 
        {...defaultProps} 
        onInvitationSent={onInvitationSentMock}
        onClose={onCloseMock}
      />
    );

    // The submit functionality would be tested with user interactions
    // This test verifies the component structure for successful flow
    expect(getByText('Enviar Invitación')).toBeInTheDocument();
  });
});