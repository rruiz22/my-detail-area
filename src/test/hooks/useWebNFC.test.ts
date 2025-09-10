import { renderHook, act } from '@testing-library/react';
import { useWebNFC } from '@/hooks/useWebNFC';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the Web NFC API
const mockNDEFReader = {
  write: vi.fn(),
  scan: vi.fn(),
  addEventListener: vi.fn(),
  stop: vi.fn()
};

const mockPermissions = {
  query: vi.fn()
};

// Setup global mocks
beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock window.NDEFReader
  (global as any).window = {
    ...global.window,
    NDEFReader: vi.fn(() => mockNDEFReader),
    location: {
      origin: 'https://test.example.com'
    }
  };
  
  // Mock navigator.permissions
  Object.defineProperty(global.navigator, 'permissions', {
    value: mockPermissions,
    writable: true
  });
});

describe('useWebNFC', () => {
  it('should detect NFC support correctly', () => {
    const { result } = renderHook(() => useWebNFC());
    expect(result.current.isSupported).toBe(true);
  });

  it('should handle unsupported browsers', () => {
    delete (global as any).window.NDEFReader;
    
    const { result } = renderHook(() => useWebNFC());
    expect(result.current.isSupported).toBe(false);
  });

  it('should request permissions successfully', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'granted' });
    
    const { result } = renderHook(() => useWebNFC());
    
    await act(async () => {
      const hasPermissions = await result.current.requestPermissions();
      expect(hasPermissions).toBe(true);
    });
  });

  it('should handle permission denial', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'denied' });
    
    const { result } = renderHook(() => useWebNFC());
    
    await act(async () => {
      const hasPermissions = await result.current.requestPermissions();
      expect(hasPermissions).toBe(false);
      expect(result.current.error).toContain('permission');
    });
  });

  it('should write NFC tag successfully', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'granted' });
    mockNDEFReader.write.mockResolvedValue(true);
    
    const { result } = renderHook(() => useWebNFC());
    
    const testData = {
      tagId: 'test-123',
      name: 'Test Tag',
      type: 'vehicle',
      dealerId: 1
    };

    await act(async () => {
      const success = await result.current.writeTag(testData);
      expect(success).toBe(true);
    });

    expect(mockNDEFReader.write).toHaveBeenCalledWith({
      records: [
        {
          recordType: "url",
          data: "https://test.example.com/qr/test-123?source=nfc"
        },
        {
          recordType: "text",
          data: expect.stringContaining('"tagId":"test-123"')
        }
      ]
    });
  });

  it('should handle write failures', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'granted' });
    mockNDEFReader.write.mockRejectedValue(new Error('Write failed'));
    
    const { result } = renderHook(() => useWebNFC());
    
    const testData = {
      tagId: 'test-123',
      name: 'Test Tag'
    };

    await act(async () => {
      const success = await result.current.writeTag(testData);
      expect(success).toBe(false);
      expect(result.current.error).toContain('failed');
    });
  });

  it('should read NFC tag successfully', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'granted' });
    
    const mockMessage = {
      records: [
        {
          recordType: 'text',
          data: new TextEncoder().encode(JSON.stringify({
            tagId: 'read-test-123',
            name: 'Read Test Tag',
            type: 'location'
          }))
        },
        {
          recordType: 'url',
          data: new TextEncoder().encode('https://test.example.com/qr/read-test-123')
        }
      ]
    };
    
    const { result } = renderHook(() => useWebNFC());
    
    // Mock the promise-based read with immediate resolution
    const readPromise = Promise.resolve(mockMessage);
    mockNDEFReader.addEventListener.mockImplementation((event, callback) => {
      if (event === 'reading') {
        setTimeout(() => {
          callback({
            message: mockMessage,
            serialNumber: 'ABCD1234'
          });
        }, 100);
      }
    });

    await act(async () => {
      // Start reading and simulate tag detection
      const dataPromise = result.current.readTag();
      
      // Simulate the reading event after a short delay
      setTimeout(() => {
        const readingCallback = mockNDEFReader.addEventListener.mock.calls
          .find(([event]) => event === 'reading')?.[1];
        
        if (readingCallback) {
          readingCallback({
            message: mockMessage,
            serialNumber: 'ABCD1234'
          });
        }
      }, 50);
      
      const data = await dataPromise;
      expect(data).toMatchObject({
        tagId: expect.any(String),
        name: expect.any(String)
      });
    });
  });

  it('should handle read timeout', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'granted' });
    
    const { result } = renderHook(() => useWebNFC());
    
    mockNDEFReader.addEventListener.mockImplementation(() => {
      // Simulate no tag being detected (timeout)
    });

    await act(async () => {
      const dataPromise = result.current.readTag();
      
      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(10000);
      
      try {
        await dataPromise;
      } catch (error: any) {
        expect(error.message).toContain('timeout');
      }
    });
  });

  it('should start and stop continuous reading', async () => {
    mockPermissions.query.mockResolvedValue({ state: 'granted' });
    
    const { result } = renderHook(() => useWebNFC());
    
    await act(async () => {
      await result.current.startReading();
      expect(result.current.isReading).toBe(true);
    });

    act(() => {
      result.current.stopReading();
      expect(result.current.isReading).toBe(false);
    });
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useWebNFC());
    
    unmount();
    
    // Should not throw any errors during cleanup
    expect(true).toBe(true);
  });
});