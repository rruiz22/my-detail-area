import { useEffect, useState } from 'react';

interface VersionInfo {
  version: string;
  buildTime: string;
  buildTimestamp: number;
  gitCommit: string;
  gitBranch: string;
  buildNumber: string;
  environment: string;
}

let cachedVersion: VersionInfo | null = null;

/**
 * Hook para obtener información de la versión de la aplicación
 * y detectar cuando hay una nueva versión disponible
 */
export function useAppVersion() {
  const [currentVersion, setCurrentVersion] = useState<VersionInfo | null>(cachedVersion);
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Cargar versión inicial
  useEffect(() => {
    if (!cachedVersion) {
      fetchVersion().then(version => {
        cachedVersion = version;
        setCurrentVersion(version);
      });
    }
  }, []);

  // Verificar nueva versión cada 5 minutos
  useEffect(() => {
    const checkInterval = setInterval(() => {
      checkForUpdate();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(checkInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVersion]);

  const fetchVersion = async (): Promise<VersionInfo | null> => {
    try {
      // Agregar timestamp para evitar caché del navegador
      // + headers explícitos para bypass total de cache
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch version');
      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching version:', error);
      return null;
    }
  };

  const checkForUpdate = async () => {
    if (isChecking || !currentVersion) return;

    setIsChecking(true);
    try {
      const latestVersion = await fetchVersion();

      if (latestVersion && latestVersion.buildNumber !== currentVersion.buildNumber) {
        console.log('🆕 New version available:', latestVersion);
        setNewVersionAvailable(true);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const reloadApp = () => {
    // Limpiar cache y recargar
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  };

  return {
    currentVersion,
    newVersionAvailable,
    isChecking,
    checkForUpdate,
    reloadApp
  };
}
