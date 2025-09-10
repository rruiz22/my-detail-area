import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Palette, 
  Cloud, 
  CloudOff,
  Download,
  Upload,
  RefreshCw,
  Save,
  Trash2,
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';
import { useCloudSyncedTheme } from '@/hooks/useCloudSync';
import { storage } from '@/lib/localStorage';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CustomTheme {
  colors: {
    primary: string;
    accent: string;
    success: string;
    warning: string;
    destructive: string;
  };
  fonts: {
    family: string;
    headingFamily: string;
    size: 'sm' | 'md' | 'lg';
  };
  shadows: {
    enabled: boolean;
    intensity: 'subtle' | 'medium' | 'prominent';
  };
  borderRadius: 'none' | 'sm' | 'md' | 'lg';
  spacing: 'compact' | 'normal' | 'relaxed';
  metadata?: {
    name: string;
    version: string;
    created: number;
    modified: number;
    synced: boolean;
  };
}

const defaultTheme: CustomTheme = {
  colors: {
    primary: 'hsl(214, 88%, 35%)',
    accent: 'hsl(38, 92%, 50%)',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    destructive: 'hsl(0, 84%, 60%)'
  },
  fonts: {
    family: 'ui-sans-serif, system-ui, sans-serif',
    headingFamily: 'ui-sans-serif, system-ui, sans-serif',
    size: 'md'
  },
  shadows: {
    enabled: true,
    intensity: 'subtle'
  },
  borderRadius: 'md',
  spacing: 'normal'
};

interface EnhancedThemeStudioProps {
  className?: string;
}

export function EnhancedThemeStudio({ className }: EnhancedThemeStudioProps) {
  const { t } = useTranslation();
  const [customTheme, setCustomTheme, syncStatus] = useCloudSyncedTheme();
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [savedThemes, setSavedThemes] = useState<Record<string, CustomTheme>>({});

  // Load saved themes on mount
  useEffect(() => {
    loadSavedThemes();
  }, []);

  const loadSavedThemes = useCallback(() => {
    try {
      const themes = storage.get('themes.saved', {}, {
        cloudSync: cloudSyncEnabled,
        syncPriority: 'important'
      });
      setSavedThemes(themes);
    } catch (error) {
      console.error('Failed to load saved themes:', error);
    }
  }, [cloudSyncEnabled]);

  const updateTheme = useCallback((updates: Partial<CustomTheme>) => {
    const updatedTheme = {
      ...customTheme,
      ...updates,
      metadata: {
        ...customTheme?.metadata,
        modified: Date.now(),
        version: '1.0.0',
        synced: false
      }
    };
    
    setCustomTheme(updatedTheme);
  }, [customTheme, setCustomTheme]);

  const saveTheme = useCallback(async (name: string) => {
    if (!customTheme) return;

    try {
      const themeToSave = {
        ...customTheme,
        metadata: {
          name,
          version: '1.0.0',
          created: Date.now(),
          modified: Date.now(),
          synced: false
        }
      };

      const updatedSavedThemes = {
        ...savedThemes,
        [name]: themeToSave
      };

      // Save to localStorage with cloud sync
      const success = storage.set('themes.saved', updatedSavedThemes, {
        cloudSync: cloudSyncEnabled,
        syncPriority: 'important'
      });

      if (success) {
        setSavedThemes(updatedSavedThemes);
        toast.success(`Theme "${name}" saved`, {
          description: cloudSyncEnabled ? 'Syncing to cloud...' : 'Saved locally'
        });

        // Sync to cloud if enabled
        if (cloudSyncEnabled) {
          await storage.syncToCloud('themes.saved', {
            cloudSync: true,
            syncPriority: 'important'
          });
        }
      }
    } catch (error) {
      toast.error('Failed to save theme', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [customTheme, savedThemes, cloudSyncEnabled]);

  const loadTheme = useCallback(async (name: string) => {
    try {
      const theme = savedThemes[name];
      if (theme) {
        setCustomTheme(theme);
        toast.success(`Theme "${name}" loaded`);
      }
    } catch (error) {
      toast.error('Failed to load theme');
    }
  }, [savedThemes, setCustomTheme]);

  const deleteTheme = useCallback(async (name: string) => {
    try {
      const updatedSavedThemes = { ...savedThemes };
      delete updatedSavedThemes[name];

      const success = storage.set('themes.saved', updatedSavedThemes, {
        cloudSync: cloudSyncEnabled,
        syncPriority: 'important'
      });

      if (success) {
        setSavedThemes(updatedSavedThemes);
        toast.success(`Theme "${name}" deleted`);

        if (cloudSyncEnabled) {
          await storage.syncToCloud('themes.saved', {
            cloudSync: true,
            syncPriority: 'important'
          });
        }
      }
    } catch (error) {
      toast.error('Failed to delete theme');
    }
  }, [savedThemes, cloudSyncEnabled]);

  const exportTheme = useCallback(async () => {
    if (!customTheme) return;

    setIsExporting(true);
    try {
      const exportData = {
        theme: customTheme,
        version: '1.0.0',
        exported: Date.now(),
        source: 'My Detail Area'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theme-${customTheme.metadata?.name || 'custom'}-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);
      toast.success('Theme exported successfully');
    } catch (error) {
      toast.error('Failed to export theme');
    } finally {
      setIsExporting(false);
    }
  }, [customTheme]);

  const importTheme = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        if (importData.theme) {
          setCustomTheme(importData.theme);
          toast.success('Theme imported successfully');
        } else {
          throw new Error('Invalid theme file format');
        }
      } catch (error) {
        toast.error('Failed to import theme', {
          description: 'Please check the file format'
        });
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(file);
  }, [setCustomTheme]);

  const restoreFromCloud = useCallback(async () => {
    try {
      const restored = await storage.restoreFromCloud('theme.custom', null, {
        cloudSync: true,
        syncPriority: 'important'
      });

      if (restored) {
        setCustomTheme(restored);
        toast.success('Theme restored from cloud');
      } else {
        toast.info('No cloud backup found');
      }
    } catch (error) {
      toast.error('Failed to restore from cloud');
    }
  }, [setCustomTheme]);

  const syncToCloud = useCallback(async () => {
    if (!customTheme) return;

    try {
      const success = await storage.syncToCloud('theme.custom', {
        cloudSync: true,
        syncPriority: 'important'
      });

      if (success) {
        toast.success('Theme synced to cloud');
      } else {
        toast.error('Failed to sync to cloud');
      }
    } catch (error) {
      toast.error('Sync failed');
    }
  }, [customTheme]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Sync Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6" />
          <h2 className="text-2xl font-semibold">Enhanced Theme Studio</h2>
          
          {/* Sync Status Indicator */}
          <div className="flex items-center gap-2">
            {cloudSyncEnabled ? (
              <>
                {syncStatus.syncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                ) : syncStatus.synced ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <Badge variant={syncStatus.synced ? "default" : "secondary"}>
                  {syncStatus.syncing ? 'Syncing...' : syncStatus.synced ? 'Synced' : 'Pending'}
                </Badge>
              </>
            ) : (
              <>
                <CloudOff className="h-4 w-4 text-gray-400" />
                <Badge variant="outline">Offline</Badge>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="cloud-sync">Cloud Sync</Label>
            <Switch
              id="cloud-sync"
              checked={cloudSyncEnabled}
              onCheckedChange={setCloudSyncEnabled}
            />
          </div>
          
          <Button variant="outline" size="sm" onClick={exportTheme} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm" asChild>
            <label>
              <Upload className="h-4 w-4 mr-2" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={importTheme}
                className="hidden"
                disabled={isImporting}
              />
            </label>
          </Button>
        </div>
      </div>

      {/* Cloud Sync Controls */}
      {cloudSyncEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Cloud Sync Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={syncToCloud}
                disabled={syncStatus.syncing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Sync to Cloud
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={restoreFromCloud}
              >
                <Download className="h-4 w-4 mr-2" />
                Restore from Cloud
              </Button>
              
              {syncStatus.lastSync && (
                <div className="text-sm text-muted-foreground">
                  Last synced: {new Date(syncStatus.lastSync).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Themes */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Themes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(savedThemes).length === 0 ? (
              <p className="text-muted-foreground">No saved themes</p>
            ) : (
              Object.entries(savedThemes).map(([name, theme]) => (
                <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: theme.colors.success }}
                      />
                    </div>
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-muted-foreground">
                        Modified: {new Date(theme.metadata?.modified || 0).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {theme.metadata?.synced && (
                      <Badge variant="outline" className="text-xs">
                        <Cloud className="h-3 w-3 mr-1" />
                        Synced
                      </Badge>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => loadTheme(name)}
                    >
                      Load
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteTheme(name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4">
            <Button 
              onClick={() => saveTheme(`Theme ${Date.now()}`)}
              disabled={!customTheme}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Current Theme
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Preview */}
      {customTheme && (
        <Card>
          <CardHeader>
            <CardTitle>Theme Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(customTheme.colors).map(([key, color]) => (
                <div key={key} className="text-center">
                  <div 
                    className="w-full h-12 rounded border mb-2"
                    style={{ backgroundColor: color as string }}
                  />
                  <p className="text-sm font-medium capitalize">{key}</p>
                  <p className="text-xs text-muted-foreground">{color as string}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}