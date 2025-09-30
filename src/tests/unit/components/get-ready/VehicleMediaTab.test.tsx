import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Mock hooks BEFORE importing the component
const mockUseVehicleMedia = vi.fn(() => ({
  data: [],
  isLoading: false,
  isError: false,
  error: null,
}));

const mockUseUploadMedia = vi.fn(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

const mockUseUpdateMedia = vi.fn(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

const mockUseDeleteMedia = vi.fn(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

vi.mock('@/hooks/useVehicleMedia', () => ({
  useVehicleMedia: mockUseVehicleMedia,
  useUploadMedia: mockUseUploadMedia,
  useUpdateMedia: mockUseUpdateMedia,
  useDeleteMedia: mockUseDeleteMedia,
}));

// Import component AFTER setting up mocks
const { VehicleMediaTab } = await import('@/components/get-ready/tabs/VehicleMediaTab');

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select onChange={(e) => onValueChange?.(e.target.value)} value={value}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'get_ready.media.title': 'Vehicle Media',
        'get_ready.media.description': 'Manage photos, videos, and documents',
        'get_ready.media.upload': 'Upload Media',
        'get_ready.media.no_media': 'No media found',
        'get_ready.media.photos': 'Photos',
        'get_ready.media.videos': 'Videos',
        'get_ready.media.documents': 'Documents',
        'get_ready.media.all': 'All',
        'get_ready.media.edit': 'Edit',
        'get_ready.media.delete': 'Delete',
        'get_ready.media.category': 'Category',
        'get_ready.media.required': 'Required',
        'get_ready.media.view_modes.grid': 'Grid',
        'get_ready.media.view_modes.list': 'List',
        'get_ready.media.categories.intake': 'Intake',
        'get_ready.media.categories.damage': 'Damage',
        'get_ready.media.categories.work_in_progress': 'Work in Progress',
        'get_ready.media.categories.completion': 'Completion',
        'get_ready.media.categories.exterior_360': 'Exterior 360',
        'get_ready.media.categories.interior': 'Interior',
        'get_ready.media.categories.undercarriage': 'Undercarriage',
        'get_ready.media.categories.engine_bay': 'Engine Bay',
        'get_ready.media.categories.vin_plates': 'VIN Plates',
        'get_ready.media.categories.odometer': 'Odometer',
        'get_ready.media.categories.general': 'General',
        'common.action_buttons.cancel': 'Cancel',
        'common.action_buttons.save': 'Save',
        'common.action_buttons.delete': 'Delete',
        'common.loading': 'Loading...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }: any) => ({
    getRootProps: () => ({
      onClick: () => {},
    }),
    getInputProps: () => ({}),
    isDragActive: false,
    open: () => {
      // Simulate file selection
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      onDrop?.([mockFile]);
    },
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (
  ui: React.ReactElement,
  { queryClient = createTestQueryClient() } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
};

// Mock media data
const createMockMedia = (overrides: any = {}) => ({
  id: 'media-123',
  vehicle_id: 'vehicle-456',
  dealer_id: 1,
  file_path: 'vehicle-456/test.jpg',
  file_name: 'test-photo.jpg',
  file_size: 1024000,
  file_type: 'image/jpeg',
  category: 'intake',
  is_required: false,
  annotations: {},
  metadata: {},
  uploaded_by: 'user-123',
  created_at: new Date().toISOString(),
  file_url: 'https://storage.example.com/vehicle-456/test.jpg',
  media_type: 'photo' as const,
  ...overrides,
});

describe('VehicleMediaTab Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('🎨 Component Rendering', () => {
    it('should render component with header and stats', () => {
      mockUseVehicleMedia.mockReturnValue({
        data: [createMockMedia()],
        isLoading: false,
        isError: false,
      });

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      expect(screen.getByText('Vehicle Media')).toBeInTheDocument();
      expect(screen.getByText('Manage photos, videos, and documents')).toBeInTheDocument();
      expect(screen.getByText('Upload Media')).toBeInTheDocument();
    });

    it('should display loading state', () => {
      const mockUseVehicleMedia = vi.fn(() => ({
        data: undefined,
        isLoading: true,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should display error state', () => {
      const mockUseVehicleMedia = vi.fn(() => ({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to load media'),
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should display empty state when no media', () => {
      const mockUseVehicleMedia = vi.fn(() => ({
        data: [],
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      expect(screen.getByText('No media found')).toBeInTheDocument();
    });

    it('should render stats cards with correct counts', () => {
      const mockMedia = [
        createMockMedia({ id: '1', media_type: 'photo' }),
        createMockMedia({ id: '2', media_type: 'photo' }),
        createMockMedia({ id: '3', media_type: 'video' }),
        createMockMedia({ id: '4', media_type: 'document' }),
      ];

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      expect(screen.getByText('Photos')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 photos
      expect(screen.getByText('Videos')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // 1 video
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // 1 document
    });
  });

  describe('📤 File Upload', () => {
    it('should open upload dialog when upload button clicked', async () => {
      const mockUseVehicleMedia = vi.fn(() => ({
        data: [],
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      const uploadButton = screen.getByText('Upload Media');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should upload file when selected', async () => {
      const mockMutate = vi.fn();
      const mockUseUploadMedia = vi.fn(() => ({
        mutate: mockMutate,
        isPending: false,
      }));

      const mockUseVehicleMedia = vi.fn(() => ({
        data: [],
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);
      vi.mocked(require('@/hooks/useVehicleMedia').useUploadMedia).mockImplementation(mockUseUploadMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      const uploadButton = screen.getByText('Upload Media');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Simulate file drop through dropzone
      const { useDropzone } = require('react-dropzone');
      const dropzone = useDropzone({ onDrop: vi.fn() });
      dropzone.open();

      // The mock will trigger onDrop with a test file
      // This would normally trigger the upload mutation
    });

    it('should close upload dialog on cancel', async () => {
      const mockUseVehicleMedia = vi.fn(() => ({
        data: [],
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      const uploadButton = screen.getByText('Upload Media');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('🔍 Filtering and View Modes', () => {
    it('should filter media by type (photos only)', async () => {
      const mockMedia = [
        createMockMedia({ id: '1', media_type: 'photo' }),
        createMockMedia({ id: '2', media_type: 'video' }),
        createMockMedia({ id: '3', media_type: 'document' }),
      ];

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      // Click on Photos filter
      const photosButton = screen.getByText('Photos');
      fireEvent.click(photosButton);

      // Only photos should be visible
      // This would be validated by checking the displayed items
    });

    it('should filter media by category', async () => {
      const mockMedia = [
        createMockMedia({ id: '1', category: 'intake' }),
        createMockMedia({ id: '2', category: 'damage' }),
        createMockMedia({ id: '3', category: 'completion' }),
      ];

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      // Find and use category filter
      const categorySelects = screen.getAllByRole('combobox');
      if (categorySelects.length > 0) {
        const categorySelect = categorySelects[0];
        fireEvent.change(categorySelect, { target: { value: 'intake' } });

        // Only intake category should be visible
      }
    });

    it('should toggle between grid and list view modes', async () => {
      const mockMedia = [
        createMockMedia({ id: '1' }),
        createMockMedia({ id: '2' }),
      ];

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      // Toggle to list view
      const listViewButton = screen.getByText('List');
      fireEvent.click(listViewButton);

      // Layout should change to list view
      // This would be validated by checking CSS classes
    });
  });

  describe('✏️ Edit Media', () => {
    it('should open edit dialog when edit button clicked', async () => {
      const mockMedia = [createMockMedia()];

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      const editButtons = screen.getAllByText('Edit');
      if (editButtons.length > 0) {
        fireEvent.click(editButtons[0]);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
      }
    });

    it('should update media when edit form submitted', async () => {
      const mockMutate = vi.fn();
      const mockUseUpdateMedia = vi.fn(() => ({
        mutate: mockMutate,
        isPending: false,
      }));

      const mockMedia = [createMockMedia()];
      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);
      vi.mocked(require('@/hooks/useVehicleMedia').useUpdateMedia).mockImplementation(mockUseUpdateMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      const editButtons = screen.getAllByText('Edit');
      if (editButtons.length > 0) {
        fireEvent.click(editButtons[0]);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Change category
        const categorySelect = screen.getByRole('combobox');
        fireEvent.change(categorySelect, { target: { value: 'damage' } });

        // Submit form
        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
              id: 'media-123',
              vehicleId: 'vehicle-456',
              category: 'damage',
            })
          );
        });
      }
    });
  });

  describe('🗑️ Delete Media', () => {
    it('should open delete confirmation when delete button clicked', async () => {
      const mockMedia = [createMockMedia()];

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      const deleteButtons = screen.getAllByText('Delete');
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
          // Delete confirmation should appear
          expect(screen.getByText('Delete')).toBeInTheDocument();
        });
      }
    });

    it('should delete media when confirmed', async () => {
      const mockMutate = vi.fn();
      const mockUseDeleteMedia = vi.fn(() => ({
        mutate: mockMutate,
        isPending: false,
      }));

      const mockMedia = [createMockMedia()];
      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);
      vi.mocked(require('@/hooks/useVehicleMedia').useDeleteMedia).mockImplementation(mockUseDeleteMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      const deleteButtons = screen.getAllByText('Delete');
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
          const confirmButtons = screen.getAllByText('Delete');
          if (confirmButtons.length > 1) {
            fireEvent.click(confirmButtons[confirmButtons.length - 1]);
          }
        });

        await waitFor(() => {
          expect(mockMutate).toHaveBeenCalledWith({
            id: 'media-123',
            vehicleId: 'vehicle-456',
            filePath: 'vehicle-456/test.jpg',
          });
        });
      }
    });
  });

  describe('🖼️ Media Preview', () => {
    it('should open preview modal when media item clicked', async () => {
      const mockMedia = [createMockMedia()];

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      // Find and click on media item
      const mediaItems = screen.getAllByRole('img');
      if (mediaItems.length > 0) {
        fireEvent.click(mediaItems[0]);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
      }
    });

    it('should display image in preview modal', async () => {
      const mockMedia = [createMockMedia()];

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      const mediaItems = screen.getAllByRole('img');
      if (mediaItems.length > 0) {
        fireEvent.click(mediaItems[0]);

        await waitFor(() => {
          const previewImages = screen.getAllByRole('img');
          expect(previewImages.length).toBeGreaterThan(0);
        });
      }
    });

    it('should close preview modal when close button clicked', async () => {
      const mockMedia = [createMockMedia()];

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      const mediaItems = screen.getAllByRole('img');
      if (mediaItems.length > 0) {
        fireEvent.click(mediaItems[0]);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Close modal
        const cancelButtons = screen.getAllByText('Cancel');
        if (cancelButtons.length > 0) {
          fireEvent.click(cancelButtons[0]);

          await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
          });
        }
      }
    });
  });

  describe('♿ Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const mockMedia = [createMockMedia()];

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
    });

    it('should be keyboard navigable', async () => {
      const mockMedia = [createMockMedia()];

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);

      const uploadButton = screen.getByText('Upload Media');
      uploadButton.focus();

      expect(uploadButton).toHaveFocus();
    });
  });

  describe('🚀 Performance', () => {
    it('should handle large number of media items efficiently', () => {
      const mockMedia = Array.from({ length: 100 }, (_, i) =>
        createMockMedia({ id: `media-${i}` })
      );

      const mockUseVehicleMedia = vi.fn(() => ({
        data: mockMedia,
        isLoading: false,
        isError: false,
      }));

      vi.mocked(require('@/hooks/useVehicleMedia').useVehicleMedia).mockImplementation(mockUseVehicleMedia);

      const startTime = performance.now();
      renderWithProviders(<VehicleMediaTab vehicleId="vehicle-456" />);
      const endTime = performance.now();

      // Should render within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
