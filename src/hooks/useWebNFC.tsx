import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface NFCData {
  tagId: string;
  name?: string;
  type?: string;
  dealerId?: number;
  vehicleVin?: string;
  locationName?: string;
  url?: string;
}

interface UseWebNFCReturn {
  isSupported: boolean;
  isWriting: boolean;
  isReading: boolean;
  error: string | null;
  lastRead: NFCData | null;
  writeTag: (data: NFCData) => Promise<boolean>;
  readTag: () => Promise<NFCData | null>;
  startReading: () => void;
  stopReading: () => void;
  requestPermissions: () => Promise<boolean>;
}

declare global {
  interface Navigator {
    nfc?: any;
  }
  
  interface Window {
    NDEFReader?: any;
  }
}

export function useWebNFC(): UseWebNFCReturn {
  const { t } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRead, setLastRead] = useState<NFCData | null>(null);
  const [reader, setReader] = useState<any>(null);

  // Check NFC support on mount
  useEffect(() => {
    const checkSupport = async () => {
      if ('NDEFReader' in window) {
        try {
          setIsSupported(true);
        } catch (err) {
          console.error('NFC not supported:', err);
          setIsSupported(false);
        }
      } else {
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError(t('nfc.errors.not_supported'));
      return false;
    }

    try {
      // Request permissions if needed
      const result = await navigator.permissions?.query?.({ name: 'nfc' as any });
      if (result?.state === 'denied') {
        setError(t('nfc.errors.permission_denied'));
        return false;
      }
      
      setError(null);
      return true;
    } catch (err) {
      console.error('Permission request failed:', err);
      setError(t('nfc.errors.permission_failed'));
      return false;
    }
  }, [isSupported, t]);

  const writeTag = useCallback(async (data: NFCData): Promise<boolean> => {
    if (!isSupported) {
      setError(t('nfc.errors.not_supported'));
      return false;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return false;

    setIsWriting(true);
    setError(null);

    try {
      const ndef = new window.NDEFReader();
      
      // Create the app URL with tag data
      const appUrl = `${window.location.origin}/qr/${data.tagId}?source=nfc`;
      
      // Prepare NDEF message with multiple records
      const message = {
        records: [
          {
            recordType: "url",
            data: appUrl
          },
          {
            recordType: "text",
            data: JSON.stringify({
              tagId: data.tagId,
              name: data.name || 'MDA NFC Tag',
              type: data.type || 'general',
              dealerId: data.dealerId,
              timestamp: new Date().toISOString()
            })
          }
        ]
      };

      await ndef.write(message);
      console.log('NFC tag written successfully:', data);
      setIsWriting(false);
      return true;

    } catch (err: any) {
      console.error('NFC write failed:', err);
      setError(err.message || t('nfc.errors.write_failed'));
      setIsWriting(false);
      return false;
    }
  }, [isSupported, requestPermissions, t]);

  const readTag = useCallback(async (): Promise<NFCData | null> => {
    if (!isSupported) {
      setError(t('nfc.errors.not_supported'));
      return null;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return null;

    setIsReading(true);
    setError(null);

    try {
      const ndef = new window.NDEFReader();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          setIsReading(false);
          reject(new Error(t('nfc.errors.read_timeout')));
        }, 10000); // 10 second timeout

        ndef.addEventListener('readingerror', () => {
          clearTimeout(timeout);
          setIsReading(false);
          reject(new Error(t('nfc.errors.read_failed')));
        });

        ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
          clearTimeout(timeout);
          setIsReading(false);

          try {
            let nfcData: NFCData = { tagId: serialNumber };

            for (const record of message.records) {
              if (record.recordType === 'text') {
                const textDecoder = new TextDecoder(record.encoding);
                const text = textDecoder.decode(record.data);
                try {
                  const parsedData = JSON.parse(text);
                  nfcData = { ...nfcData, ...parsedData };
                } catch {
                  // If not JSON, treat as plain text
                  nfcData.name = text;
                }
              } else if (record.recordType === 'url') {
                const textDecoder = new TextDecoder();
                nfcData.url = textDecoder.decode(record.data);
              }
            }

            setLastRead(nfcData);
            resolve(nfcData);
          } catch (err) {
            reject(err);
          }
        });

        ndef.scan();
      });

    } catch (err: any) {
      console.error('NFC read failed:', err);
      setError(err.message || t('nfc.errors.read_failed'));
      setIsReading(false);
      return null;
    }
  }, [isSupported, requestPermissions, t]);

  const startReading = useCallback(async () => {
    if (!isSupported) return;

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const ndef = new window.NDEFReader();
      setReader(ndef);
      setIsReading(true);
      
      ndef.addEventListener('readingerror', () => {
        setError(t('nfc.errors.read_failed'));
        setIsReading(false);
      });

      ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
        try {
          let nfcData: NFCData = { tagId: serialNumber };

          for (const record of message.records) {
            if (record.recordType === 'text') {
              const textDecoder = new TextDecoder(record.encoding);
              const text = textDecoder.decode(record.data);
              try {
                const parsedData = JSON.parse(text);
                nfcData = { ...nfcData, ...parsedData };
              } catch {
                nfcData.name = text;
              }
            }
          }

          setLastRead(nfcData);
        } catch (err) {
          console.error('Error processing NFC data:', err);
        }
      });

      await ndef.scan();
    } catch (err: any) {
      console.error('Failed to start NFC reading:', err);
      setError(err.message || t('nfc.errors.scan_failed'));
      setIsReading(false);
    }
  }, [isSupported, requestPermissions, t]);

  const stopReading = useCallback(() => {
    if (reader) {
      try {
        reader.stop?.();
      } catch (err) {
        console.error('Error stopping NFC reader:', err);
      }
    }
    setReader(null);
    setIsReading(false);
  }, [reader]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopReading();
    };
  }, [stopReading]);

  return {
    isSupported,
    isWriting,
    isReading,
    error,
    lastRead,
    writeTag,
    readTag,
    startReading,
    stopReading,
    requestPermissions
  };
}