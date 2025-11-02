import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Camera,
  Zap,
  Brain,
  Database,
  Shield,
  RotateCcw,
  Download,
  Upload,
  Target,
  Clock
} from 'lucide-react';
import { useOptimizedVinScanner } from '@/hooks/useOptimizedVinScanner';
import { vinAutoCorrection } from '@/utils/vinAutoCorrection';
import { useToast } from '@/hooks/use-toast';

interface VinScannerConfig {
  // Camera settings
  preferredCamera: 'environment' | 'user';
  resolution: 'hd' | 'fhd' | 'uhd';
  frameRate: number;

  // OCR settings
  ocrEngine: 'tesseract' | 'enhanced' | 'hybrid';
  language: 'eng' | 'eng+spa' | 'auto';
  confidence_threshold: number;

  // Smart features
  autoFocus: boolean;
  autoCorrection: boolean;
  realTimeValidation: boolean;
  cacheResults: boolean;

  // Advanced settings
  maxRetries: number;
  timeout: number;
  debugMode: boolean;
  logScans: boolean;

  // Performance
  webWorkers: boolean;
  maxConcurrentScans: number;
  cacheSize: number;
}

interface VinScannerSettingsProps {
  className?: string;
}

const DEFAULT_CONFIG: VinScannerConfig = {
  preferredCamera: 'environment',
  resolution: 'fhd',
  frameRate: 30,
  ocrEngine: 'hybrid',
  language: 'eng',
  confidence_threshold: 0.8,
  autoFocus: true,
  autoCorrection: true,
  realTimeValidation: true,
  cacheResults: true,
  maxRetries: 3,
  timeout: 30000,
  debugMode: false,
  logScans: true,
  webWorkers: true,
  maxConcurrentScans: 3,
  cacheSize: 100
};

export function VinScannerSettings({ className }: VinScannerSettingsProps) {
  const { t } = useTranslation();
  const { getCacheStats, clearCache } = useOptimizedVinScanner();
  const [config, setConfig] = useState<VinScannerConfig>(DEFAULT_CONFIG);
  const [cacheStats, setCacheStats] = useState({ size: 0, hitRate: 0 });

  // Load configuration from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vinScannerConfig');
      if (stored) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.warn('Failed to load VIN scanner config:', error);
    }

    // Load cache stats
    setCacheStats(getCacheStats());
  }, [getCacheStats]);

  // Save configuration
  const saveConfig = (newConfig: VinScannerConfig) => {
    try {
      localStorage.setItem('vinScannerConfig', JSON.stringify(newConfig));
      setConfig(newConfig);
      toast({ description: t('settings.config_saved') });
    } catch (error) {
      console.error('Failed to save config:', error);
      toast({ variant: 'destructive', description: t('settings.config_save_failed') });
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    saveConfig(DEFAULT_CONFIG);
    toast({ description: t('settings.reset_to_defaults') });
  };

  // Export configuration
  const exportConfig = () => {
    const exportData = {
      config,
      cacheStats,
      correctionStats: vinAutoCorrection.getStats(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `vin_scanner_config_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  // Import configuration
  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.config) {
          saveConfig({ ...DEFAULT_CONFIG, ...imported.config });
          toast({ description: t('settings.config_imported') });
        }
      } catch (error) {
        toast({ variant: 'destructive', description: t('settings.invalid_config_file') });
      }
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = '';
  };

  // Clear cache
  const handleClearCache = () => {
    clearCache();
    setCacheStats({ size: 0, hitRate: 0 });
    toast({ description: t('settings.cache_cleared') });
  };

  // Update config helper
  const updateConfig = (key: keyof VinScannerConfig, value: any) => {
    saveConfig({ ...config, [key]: value });
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Camera Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {t('vin_scanner_settings.camera_settings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('vin_scanner_settings.preferred_camera')}</Label>
                <Select
                  value={config.preferredCamera}
                  onValueChange={(value: 'environment' | 'user') => updateConfig('preferredCamera', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="environment">{t('vin_scanner_settings.back_camera')}</SelectItem>
                    <SelectItem value="user">{t('vin_scanner_settings.front_camera')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('vin_scanner_settings.resolution')}</Label>
                <Select
                  value={config.resolution}
                  onValueChange={(value: 'hd' | 'fhd' | 'uhd') => updateConfig('resolution', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hd">HD (1280x720)</SelectItem>
                    <SelectItem value="fhd">Full HD (1920x1080)</SelectItem>
                    <SelectItem value="uhd">4K UHD (3840x2160)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('vin_scanner_settings.frame_rate')}: {config.frameRate}fps</Label>
              <Slider
                value={[config.frameRate]}
                onValueChange={([value]) => updateConfig('frameRate', value)}
                min={15}
                max={60}
                step={5}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* OCR Engine Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              {t('vin_scanner_settings.ocr_engine')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('vin_scanner_settings.engine_type')}</Label>
                <Select
                  value={config.ocrEngine}
                  onValueChange={(value: 'tesseract' | 'enhanced' | 'hybrid') => updateConfig('ocrEngine', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tesseract">{t('vin_scanner_settings.tesseract_only')}</SelectItem>
                    <SelectItem value="enhanced">{t('vin_scanner_settings.enhanced_engine')}</SelectItem>
                    <SelectItem value="hybrid">{t('vin_scanner_settings.hybrid_mode')} ⭐</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('vin_scanner_settings.language_support')}</Label>
                <Select
                  value={config.language}
                  onValueChange={(value: 'eng' | 'eng+spa' | 'auto') => updateConfig('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eng">{t('vin_scanner_settings.english_only')}</SelectItem>
                    <SelectItem value="eng+spa">{t('vin_scanner_settings.english_spanish')}</SelectItem>
                    <SelectItem value="auto">{t('vin_scanner_settings.auto_detect')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('vin_scanner_settings.confidence_threshold')}: {(config.confidence_threshold * 100).toFixed(0)}%</Label>
              <Slider
                value={[config.confidence_threshold]}
                onValueChange={([value]) => updateConfig('confidence_threshold', value)}
                min={0.5}
                max={1.0}
                step={0.05}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Smart Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              {t('vin_scanner_settings.smart_features')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('vin_scanner_settings.auto_focus')}</Label>
                    <div className="text-xs text-muted-foreground">
                      {t('vin_scanner_settings.auto_focus_desc')}
                    </div>
                  </div>
                  <Switch
                    checked={config.autoFocus}
                    onCheckedChange={(checked) => updateConfig('autoFocus', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('vin_scanner_settings.auto_correction')}</Label>
                    <div className="text-xs text-muted-foreground">
                      {t('vin_scanner_settings.auto_correction_desc')}
                    </div>
                  </div>
                  <Switch
                    checked={config.autoCorrection}
                    onCheckedChange={(checked) => updateConfig('autoCorrection', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('vin_scanner_settings.real_time_validation')}</Label>
                    <div className="text-xs text-muted-foreground">
                      {t('vin_scanner_settings.real_time_validation_desc')}
                    </div>
                  </div>
                  <Switch
                    checked={config.realTimeValidation}
                    onCheckedChange={(checked) => updateConfig('realTimeValidation', checked)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('vin_scanner_settings.cache_results')}</Label>
                    <div className="text-xs text-muted-foreground">
                      {t('vin_scanner_settings.cache_results_desc')}
                    </div>
                  </div>
                  <Switch
                    checked={config.cacheResults}
                    onCheckedChange={(checked) => updateConfig('cacheResults', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('vin_scanner_settings.web_workers')}</Label>
                    <div className="text-xs text-muted-foreground">
                      {t('vin_scanner_settings.web_workers_desc')}
                    </div>
                  </div>
                  <Switch
                    checked={config.webWorkers}
                    onCheckedChange={(checked) => updateConfig('webWorkers', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('vin_scanner_settings.debug_mode')}</Label>
                    <div className="text-xs text-muted-foreground">
                      {t('vin_scanner_settings.debug_mode_desc')}
                    </div>
                  </div>
                  <Switch
                    checked={config.debugMode}
                    onCheckedChange={(checked) => updateConfig('debugMode', checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Performance Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                {t('vin_scanner_settings.performance_tuning')}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('vin_scanner_settings.max_concurrent')}: {config.maxConcurrentScans}</Label>
                  <Slider
                    value={[config.maxConcurrentScans]}
                    onValueChange={([value]) => updateConfig('maxConcurrentScans', value)}
                    min={1}
                    max={8}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('vin_scanner_settings.timeout')}: {config.timeout / 1000}s</Label>
                  <Slider
                    value={[config.timeout]}
                    onValueChange={([value]) => updateConfig('timeout', value)}
                    min={10000}
                    max={60000}
                    step={5000}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cache Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              {t('vin_scanner_settings.cache_management')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{cacheStats.size}</div>
                <div className="text-xs text-muted-foreground">{t('vin_scanner_settings.cached_items')}</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-success">{(cacheStats.hitRate * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">{t('vin_scanner_settings.hit_rate')}</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-accent">{vinAutoCorrection.getStats().totalLearned}</div>
                <div className="text-xs text-muted-foreground">{t('vin_scanner_settings.learned_corrections')}</div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleClearCache}
                className="flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {t('vin_scanner_settings.clear_cache')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Machine Learning Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              {t('vin_scanner_settings.ml_performance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const mlStats = vinAutoCorrection.getStats();
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">{t('vin_scanner_settings.total_learned')}</span>
                          <Badge variant="secondary">{mlStats.totalLearned}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">{t('vin_scanner_settings.successful_corrections')}</span>
                          <Badge variant="default">{mlStats.totalCorrections}</Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">{t('vin_scanner_settings.top_corrections')}</Label>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {mlStats.topCorrections.slice(0, 5).map(([vin, count], index) => (
                            <div key={index} className="flex justify-between text-xs">
                              <code className="bg-muted px-1 rounded font-mono">{vin}</code>
                              <span className="text-muted-foreground">{count}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {t('vin_scanner_settings.ml_accuracy')}: {
                          mlStats.totalCorrections > 0
                            ? ((mlStats.totalCorrections / (mlStats.totalLearned + mlStats.totalCorrections)) * 100).toFixed(1)
                            : 'N/A'
                        }%
                      </Badge>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {t('vin_scanner_settings.configuration_management')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={resetToDefaults}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {t('vin_scanner_settings.reset_defaults')}
              </Button>

              <Button
                variant="outline"
                onClick={exportConfig}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('vin_scanner_settings.export_config')}
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={importConfig}
                  className="hidden"
                  id="config-import"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('config-import')?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {t('vin_scanner_settings.import_config')}
                </Button>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              {t('vin_scanner_settings.config_note')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}