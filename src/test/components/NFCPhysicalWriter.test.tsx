import React from 'react';
import { render, screen, fireEvent, waitFor } from '../utils/test-utils';
import { NFCPhysicalWriter } from '@/components/nfc/NFCPhysicalWriter';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the useWebNFC hook
const mockUseWebNFC = {
  isSupported: true,
  isWriting: false,
  error: null,
  writeTag: vi.fn(),
  requestPermissions: vi.fn()
};

vi.mock('@/hooks/useWebNFC', () => ({
  useWebNFC: () => mockUseWebNFC
}));

const mockTag = {
  id: 'test-tag-1',
  name: 'Test Vehicle Tag',
  tag_uid: 'ABCD1234',
  tag_type: 'vehicle',
  description: 'Test tag for vehicle tracking',
  vehicle_vin: '1HGBH41JXMN109186',
  location_name: null,
  location_coordinates: null,
  is_active: true,
  is_permanent: false,
  scan_count: 5,
  last_scanned_at: '2024-01-15T10:30:00Z',
  created_at: '2024-01-10T08:00:00Z',
  dealer_id: 1,
  order_id: null,
  created_by: 'user-123'
};

describe('NFCPhysicalWriter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWebNFC.isSupported = true;
    mockUseWebNFC.isWriting = false;
    mockUseWebNFC.error = null;
    mockUseWebNFC.requestPermissions.mockResolvedValue(true);
    mockUseWebNFC.writeTag.mockResolvedValue(true);
  });

  it('should render correctly when NFC is supported', () => {
    render(
      <NFCPhysicalWriter
        isOpen={true}
        onClose={() => {}}
        tag={mockTag}
      />
    );

    expect(screen.getByText('Write to Physical NFC Tag')).toBeInTheDocument();
    expect(screen.getByText('Test Vehicle Tag')).toBeInTheDocument();
    expect(screen.getByText('1HGBH41JXMN109186')).toBeInTheDocument();
  });

  it('should show not supported message when NFC is not available', () => {
    mockUseWebNFC.isSupported = false;

    render(
      <NFCPhysicalWriter
        isOpen={true}
        onClose={() => {}}
        tag={mockTag}
      />
    );

    expect(screen.getByText(/NFC is not supported/)).toBeInTheDocument();
  });

  it('should handle successful tag writing', async () => {
    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <NFCPhysicalWriter
        isOpen={true}
        onClose={mockOnClose}
        tag={mockTag}
        onSuccess={mockOnSuccess}
      />
    );

    const writeButton = screen.getByText('Write Tag');
    fireEvent.click(writeButton);

    await waitFor(() => {
      expect(mockUseWebNFC.requestPermissions).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockUseWebNFC.writeTag).toHaveBeenCalledWith({
        tagId: mockTag.id,
        name: mockTag.name,
        type: mockTag.tag_type,
        dealerId: mockTag.dealer_id,
        vehicleVin: mockTag.vehicle_vin
      });
    });

    // Should show success state
    await waitFor(() => {
      expect(screen.getByText('Tag written successfully!')).toBeInTheDocument();
    });
  });

  it('should handle permission denial', async () => {
    mockUseWebNFC.requestPermissions.mockResolvedValue(false);
    mockUseWebNFC.error = 'Permission denied';

    render(
      <NFCPhysicalWriter
        isOpen={true}
        onClose={() => {}}
        tag={mockTag}
      />
    );

    const writeButton = screen.getByText('Write Tag');
    fireEvent.click(writeButton);

    await waitFor(() => {
      expect(screen.getByText(/Permission denied/)).toBeInTheDocument();
    });
  });

  it('should handle write failure', async () => {
    mockUseWebNFC.writeTag.mockResolvedValue(false);
    mockUseWebNFC.error = 'Failed to write tag';

    render(
      <NFCPhysicalWriter
        isOpen={true}
        onClose={() => {}}
        tag={mockTag}
      />
    );

    const writeButton = screen.getByText('Write Tag');
    fireEvent.click(writeButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to write tag')).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should show writing state with animation', async () => {
    mockUseWebNFC.isWriting = true;
    
    // Mock a delayed write operation
    mockUseWebNFC.writeTag.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(true), 1000);
      });
    });

    render(
      <NFCPhysicalWriter
        isOpen={true}
        onClose={() => {}}
        tag={mockTag}
      />
    );

    const writeButton = screen.getByText('Write Tag');
    fireEvent.click(writeButton);

    // Should show preparing state first
    await waitFor(() => {
      expect(screen.getByText('Preparing...')).toBeInTheDocument();
    });
  });

  it('should disable close button during writing', async () => {
    mockUseWebNFC.isWriting = true;

    render(
      <NFCPhysicalWriter
        isOpen={true}
        onClose={() => {}}
        tag={mockTag}
      />
    );

    const writeButton = screen.getByText('Write Tag');
    fireEvent.click(writeButton);

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();
  });

  it('should display location tag information correctly', () => {
    const locationTag = {
      ...mockTag,
      tag_type: 'location',
      location_name: 'Service Bay 1',
      vehicle_vin: null
    };

    render(
      <NFCPhysicalWriter
        isOpen={true}
        onClose={() => {}}
        tag={locationTag}
      />
    );

    expect(screen.getByText('Service Bay 1')).toBeInTheDocument();
    expect(screen.queryByText('1HGBH41JXMN109186')).not.toBeInTheDocument();
  });

  it('should call onClose when cancel is clicked', () => {
    const mockOnClose = vi.fn();

    render(
      <NFCPhysicalWriter
        isOpen={true}
        onClose={mockOnClose}
        tag={mockTag}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should auto-close after successful write', async () => {
    vi.useFakeTimers();
    
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    render(
      <NFCPhysicalWriter
        isOpen={true}
        onClose={mockOnClose}
        tag={mockTag}
        onSuccess={mockOnSuccess}
      />
    );

    const writeButton = screen.getByText('Write Tag');
    fireEvent.click(writeButton);

    await waitFor(() => {
      expect(screen.getByText('Tag written successfully!')).toBeInTheDocument();
    });

    // Fast-forward the auto-close timer
    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });
});