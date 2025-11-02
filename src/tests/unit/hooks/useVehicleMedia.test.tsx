import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVehicleMedia, useUploadMedia, useUpdateMedia, useDeleteMedia } from '@/hooks/useVehicleMedia';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      dealer_id: 1,
      email: 'test@example.com',
    },
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'get_ready.media.error_loading': 'Error loading media',
        'get_ready.media.uploaded_successfully': 'Uploaded successfully',
        'get_ready.media.error_uploading': 'Error uploading',
        'get_ready.media.updated_successfully': 'Updated successfully',
        'get_ready.media.error_updating': 'Error updating',
        'get_ready.media.deleted_successfully': 'Deleted successfully',
        'get_ready.media.error_deleting': 'Error deleting',
      };
      return translations[key] || key;
    },
  }),
}));

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock data
const mockMediaItem = {
  id: 'media-123',
  vehicle_id: 'vehicle-456',
  dealer_id: 1,
  file_path: 'vehicle-456/1234567890_abc123.jpg',
  file_name: 'test-photo.jpg',
  file_size: 1024000,
  file_type: 'image/jpeg',
  category: 'intake',
  is_required: false,
  annotations: {},
  metadata: { width: 1920, height: 1080 },
  uploaded_by: 'test-user-id',
  created_at: new Date().toISOString(),
  uploaded_by_profile: {
    first_name: 'Test',
    last_name: 'User',
  },
};

describe('useVehicleMedia Hook Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('📥 useVehicleMedia - Fetch Media', () => {
    it('should fetch vehicle media successfully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockMediaItem],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: mockOrder,
      });

      // Mock storage getPublicUrl
      vi.mocked(supabase.storage.from).mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/vehicle-456/test.jpg' },
        }),
      } as any);

      const { result } = renderHook(() => useVehicleMedia('vehicle-456'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.from).toHaveBeenCalledWith('vehicle_media');
      expect(mockEq).toHaveBeenCalledWith('vehicle_id', 'vehicle-456');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]).toMatchObject({
        id: 'media-123',
        vehicle_id: 'vehicle-456',
        media_type: 'photo',
        file_url: 'https://storage.example.com/vehicle-456/test.jpg',
      });
    });

    it('should return empty array when vehicleId is null', async () => {
      const { result } = renderHook(() => useVehicleMedia(null), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should handle fetch error gracefully', async () => {
      const mockError = new Error('Database error');
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useVehicleMedia('vehicle-456'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({ variant: 'destructive', description: 'Error loading media' });
      expect(result.current.error).toBe(mockError);
    });

    it('should correctly determine media_type from file_type', async () => {
      const mockVideoItem = { ...mockMediaItem, file_type: 'video/mp4' };
      const mockDocItem = { ...mockMediaItem, file_type: 'application/pdf' };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockMediaItem, mockVideoItem, mockDocItem],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: mockOrder,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/test.file' },
        }),
      } as any);

      const { result } = renderHook(() => useVehicleMedia('vehicle-456'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].media_type).toBe('photo');
      expect(result.current.data?.[1].media_type).toBe('video');
      expect(result.current.data?.[2].media_type).toBe('document');
    });

    it('should not fetch when vehicleId is empty string', async () => {
      const { result } = renderHook(() => useVehicleMedia(''), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('📤 useUploadMedia - Upload Media', () => {
    it('should upload media successfully', async () => {
      const mockFile = new File(['test'], 'test-photo.jpg', { type: 'image/jpeg' });
      const mockUploadInput = {
        vehicle_id: 'vehicle-456',
        file: mockFile,
        category: 'intake',
        is_required: false,
      };

      // Mock storage upload
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'vehicle-456/test.jpg' },
        error: null,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
      } as any);

      // Mock database insert
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockMediaItem,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useUploadMedia(), { wrapper });

      result.current.mutate(mockUploadInput);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('vehicle-456/'),
        mockFile,
        {
          cacheControl: '3600',
          upsert: false,
        }
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicle_id: 'vehicle-456',
          dealer_id: 1,
          file_name: 'test-photo.jpg',
          category: 'intake',
          is_required: false,
        })
      );

      expect(mockToast).toHaveBeenCalledWith({ description: 'Uploaded successfully' });
      expect(result.current.data).toEqual(mockMediaItem);
    });

    it('should handle storage upload error', async () => {
      const mockFile = new File(['test'], 'test-photo.jpg', { type: 'image/jpeg' });
      const mockError = new Error('Storage error');

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
      } as any);

      const { result } = renderHook(() => useUploadMedia(), { wrapper });

      result.current.mutate({
        vehicle_id: 'vehicle-456',
        file: mockFile,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({ variant: 'destructive', description: 'Error uploading' });
      expect(result.current.error).toBe(mockError);
    });

    it('should clean up storage file on database insert error', async () => {
      const mockFile = new File(['test'], 'test-photo.jpg', { type: 'image/jpeg' });
      const mockDbError = new Error('Database error');

      // Mock successful storage upload
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'vehicle-456/test.jpg' },
        error: null,
      });

      const mockRemove = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      } as any);

      // Mock failed database insert
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockDbError,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useUploadMedia(), { wrapper });

      result.current.mutate({
        vehicle_id: 'vehicle-456',
        file: mockFile,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockRemove).toHaveBeenCalledWith(['vehicle-456/test.jpg']);
      expect(mockToast).toHaveBeenCalledWith({ variant: 'destructive', description: 'Error uploading' });
    });

    it('should generate unique file names for uploads', async () => {
      const mockFile = new File(['test'], 'test-photo.jpg', { type: 'image/jpeg' });

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'vehicle-456/123_abc.jpg' },
        error: null,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
      } as any);

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockMediaItem,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useUploadMedia(), { wrapper });

      result.current.mutate({
        vehicle_id: 'vehicle-456',
        file: mockFile,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify file name includes vehicle_id, timestamp, and random string
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^vehicle-456\/\d+_[a-z0-9]+\.jpg$/),
        mockFile,
        expect.any(Object)
      );
    });
  });

  describe('✏️ useUpdateMedia - Update Media', () => {
    it('should update media successfully', async () => {
      const mockUpdateInput = {
        id: 'media-123',
        vehicleId: 'vehicle-456',
        category: 'damage',
        is_required: true,
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockMediaItem, category: 'damage', is_required: true },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateMedia(), { wrapper });

      result.current.mutate(mockUpdateInput);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        category: 'damage',
        is_required: true,
      });

      expect(mockEq).toHaveBeenCalledWith('id', 'media-123');
      expect(mockToast).toHaveBeenCalledWith({ description: 'Updated successfully' });
    });

    it('should handle update error gracefully', async () => {
      const mockError = new Error('Update failed');
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateMedia(), { wrapper });

      result.current.mutate({
        id: 'media-123',
        vehicleId: 'vehicle-456',
        category: 'damage',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({ variant: 'destructive', description: 'Error updating' });
      expect(result.current.error).toBe(mockError);
    });
  });

  describe('🗑️ useDeleteMedia - Delete Media', () => {
    it('should delete media successfully', async () => {
      const mockDeleteInput = {
        id: 'media-123',
        vehicleId: 'vehicle-456',
        filePath: 'vehicle-456/test.jpg',
      };

      // Mock storage remove
      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as any);

      // Mock database delete
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      const { result } = renderHook(() => useDeleteMedia(), { wrapper });

      result.current.mutate(mockDeleteInput);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockRemove).toHaveBeenCalledWith(['vehicle-456/test.jpg']);
      expect(mockEq).toHaveBeenCalledWith('id', 'media-123');
      expect(mockToast).toHaveBeenCalledWith({ description: 'Deleted successfully' });
    });

    it('should continue with database delete even if storage delete fails', async () => {
      const mockStorageError = new Error('Storage delete failed');
      const mockDeleteInput = {
        id: 'media-123',
        vehicleId: 'vehicle-456',
        filePath: 'vehicle-456/test.jpg',
      };

      // Mock storage remove failure
      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: mockStorageError,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as any);

      // Mock successful database delete
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      const { result } = renderHook(() => useDeleteMedia(), { wrapper });

      result.current.mutate(mockDeleteInput);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockRemove).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'media-123');
      expect(mockToast).toHaveBeenCalledWith({ description: 'Deleted successfully' });
    });

    it('should handle database delete error', async () => {
      const mockDbError = new Error('Database delete failed');
      const mockDeleteInput = {
        id: 'media-123',
        vehicleId: 'vehicle-456',
        filePath: 'vehicle-456/test.jpg',
      };

      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as any);

      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: mockDbError,
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      const { result } = renderHook(() => useDeleteMedia(), { wrapper });

      result.current.mutate(mockDeleteInput);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({ variant: 'destructive', description: 'Error deleting' });
      expect(result.current.error).toBe(mockDbError);
    });
  });
});
