import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Palette, 
  Type, 
  Layers, 
  RotateCcw, 
  Save, 
  Eye, 
  Download,
  Upload,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
    applyToCards: boolean;
    applyToButtons: boolean;
    applyToInputs: boolean;
  };
  borderRadius: 'none' | 'sm' | 'md' | 'lg';
  spacing: 'compact' | 'normal' | 'relaxed';
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
    intensity: 'subtle',
    applyToCards: true,
    applyToButtons: true,
    applyToInputs: true
  },
  borderRadius: 'md',
  spacing: 'normal'
};

const notionThemes = {
  notion_classic: {
    name: 'Notion Classic',
    colors: {
      primary: 'hsl(0, 0%, 9%)',
      accent: 'hsl(46, 100%, 50%)',
      success: 'hsl(120, 60%, 45%)',
      warning: 'hsl(46, 100%, 50%)',
      destructive: 'hsl(0, 84%, 60%)'
    },
    description: 'Clean, minimal design inspired by Notion'
  },
  notion_warm: {
    name: 'Notion Warm',
    colors: {
      primary: 'hsl(25, 95%, 53%)',
      accent: 'hsl(46, 100%, 50%)',
      success: 'hsl(120, 60%, 45%)',
      warning: 'hsl(35, 91%, 65%)',
      destructive: 'hsl(0, 84%, 60%)'
    },
    description: 'Warm, inviting color palette'
  },
  corporate_blue: {
    name: 'Corporate Blue',
    colors: {
      primary: 'hsl(214, 88%, 35%)',
      accent: 'hsl(38, 92%, 50%)',
      success: 'hsl(142, 76%, 36%)',
      warning: 'hsl(38, 92%, 50%)',
      destructive: 'hsl(0, 84%, 60%)'
    },
    description: 'Professional automotive industry colors'
  }
};

const fontFamilies = [
  { value: 'ui-sans-serif, system-ui, sans-serif', label: 'System Default' },
  { value: 'Inter, ui-sans-serif, system-ui, sans-serif', label: 'Inter' },
  { value: 'ui-serif, Georgia, serif', label: 'Serif' },
  { value: 'ui-monospace, monospace', label: 'Monospace' },
  { value: '"Segoe UI", system-ui, sans-serif', label: 'Segoe UI' }
];

export function ThemeStudio() {
  const { t } = useTranslation();
  const [currentTheme, setCurrentTheme] = useState<CustomTheme>(defaultTheme);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    // Load saved theme from localStorage
    try {
      const savedTheme = localStorage.getItem('mda-custom-theme');
      if (savedTheme) {
        setCurrentTheme(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.warn('Failed to load saved theme:', error);
    }
  }, []);

  const applyTheme = (theme: CustomTheme) => {
    try {
      setIsApplying(true);
      const root = document.documentElement;

      // Apply colors
      root.style.setProperty('--primary', theme.colors.primary.replace('hsl(', '').replace(')', ''));
      root.style.setProperty('--accent', theme.colors.accent.replace('hsl(', '').replace(')', ''));
      root.style.setProperty('--success', theme.colors.success.replace('hsl(', '').replace(')', ''));
      root.style.setProperty('--warning', theme.colors.warning.replace('hsl(', '').replace(')', ''));
      root.style.setProperty('--destructive', theme.colors.destructive.replace('hsl(', '').replace(')', ''));

      // Apply typography
      root.style.setProperty('--font-family', theme.fonts.family);
      
      // Apply shadows
      if (theme.shadows.enabled) {
        applyShadows(theme.shadows.intensity);
      } else {
        removeShadows();
      }

      // Save theme
      localStorage.setItem('mda-custom-theme', JSON.stringify(theme));
      setCurrentTheme(theme);
      
      toast.success('Theme applied successfully');
    } catch (error) {
      console.error('Error applying theme:', error);
      toast.error('Failed to apply theme');
    } finally {
      setIsApplying(false);
    }
  };

  const applyShadows = (intensity: 'subtle' | 'medium' | 'prominent') => {
    const root = document.documentElement;
    
    const shadowSets = {
      subtle: {
        card: '0 1px 3px 0 hsl(0 0% 0% / 0.05)',
        header: '0 1px 2px 0 hsl(0 0% 0% / 0.05)',
        modal: '0 4px 12px 0 hsl(0 0% 0% / 0.08)'
      },
      medium: {
        card: '0 2px 8px 0 hsl(0 0% 0% / 0.1)',
        header: '0 2px 4px 0 hsl(0 0% 0% / 0.08)',
        modal: '0 8px 24px 0 hsl(0 0% 0% / 0.12)'
      },
      prominent: {
        card: '0 4px 16px 0 hsl(0 0% 0% / 0.15)',
        header: '0 4px 8px 0 hsl(0 0% 0% / 0.12)',
        modal: '0 12px 32px 0 hsl(0 0% 0% / 0.18)'
      }
    };

    const shadows = shadowSets[intensity];
    root.style.setProperty('--shadow-card', shadows.card);
    root.style.setProperty('--shadow-header', shadows.header);
    root.style.setProperty('--shadow-modal', shadows.modal);
  };

  const removeShadows = () => {
    const root = document.documentElement;
    root.style.setProperty('--shadow-card', 'none');
    root.style.setProperty('--shadow-header', 'none');
    root.style.setProperty('--shadow-modal', 'none');
  };

  const resetToDefault = () => {
    applyTheme(defaultTheme);
    toast.success('Theme reset to default');
  };

  const applyPresetTheme = (preset: keyof typeof notionThemes) => {
    const presetTheme = {
      ...currentTheme,
      colors: notionThemes[preset].colors
    };
    applyTheme(presetTheme);
  };

  const updateThemeColors = (colorKey: keyof CustomTheme['colors'], value: string) => {
    const newTheme = {
      ...currentTheme,
      colors: {
        ...currentTheme.colors,
        [colorKey]: value
      }
    };
    setCurrentTheme(newTheme);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8 text-primary" />
            Theme Studio
          </h1>
          <p className="text-muted-foreground mt-2">
            Customize colors, typography, shadows and spacing for your organization
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={() => applyTheme(currentTheme)} disabled={isApplying}>
            {isApplying ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Apply Theme
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colors Section */}
        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme Presets */}
            <div>
              <Label>Theme Presets</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {Object.entries(notionThemes).map(([key, theme]) => (
                  <Button
                    key={key}
                    variant="outline"
                    className="justify-start text-left h-auto p-3"
                    onClick={() => applyPresetTheme(key as keyof typeof notionThemes)}
                  >
                    <div>
                      <p className="font-medium">{theme.name}</p>
                      <p className="text-xs text-muted-foreground">{theme.description}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="space-y-3">
              <Label>Custom Colors</Label>
              
              {Object.entries(currentTheme.colors).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <Label className="w-20 capitalize text-sm">{key}</Label>
                  <div className="flex items-center gap-2 flex-1">
                    <div 
                      className="w-6 h-6 rounded border border-border"
                      style={{ backgroundColor: value }}
                    />
                    <Input
                      type="text"
                      value={value}
                      onChange={(e) => updateThemeColors(key as keyof CustomTheme['colors'], e.target.value)}
                      className="font-mono text-xs"
                      placeholder="hsl(214, 88%, 35%)"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Typography Section */}
        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Typography
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Font Family</Label>
              <Select
                value={currentTheme.fonts.family}
                onValueChange={(value) => setCurrentTheme(prev => ({
                  ...prev,
                  fonts: { ...prev.fonts, family: value }
                }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Font Size Scale</Label>
              <Select
                value={currentTheme.fonts.size}
                onValueChange={(value: 'sm' | 'md' | 'lg') => setCurrentTheme(prev => ({
                  ...prev,
                  fonts: { ...prev.fonts, size: value }
                }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small (90%)</SelectItem>
                  <SelectItem value="md">Medium (100%)</SelectItem>
                  <SelectItem value="lg">Large (110%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Visual Effects Section */}
        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Visual Effects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Shadows</Label>
              <Switch
                checked={currentTheme.shadows.enabled}
                onCheckedChange={(checked) => setCurrentTheme(prev => ({
                  ...prev,
                  shadows: { ...prev.shadows, enabled: checked }
                }))}
              />
            </div>

            {currentTheme.shadows.enabled && (
              <>
                <div>
                  <Label>Shadow Intensity</Label>
                  <Select
                    value={currentTheme.shadows.intensity}
                    onValueChange={(value: 'subtle' | 'medium' | 'prominent') => setCurrentTheme(prev => ({
                      ...prev,
                      shadows: { ...prev.shadows, intensity: value }
                    }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtle">Subtle</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="prominent">Prominent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Apply Shadows To:</Label>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Cards</Label>
                    <Switch
                      checked={currentTheme.shadows.applyToCards}
                      onCheckedChange={(checked) => setCurrentTheme(prev => ({
                        ...prev,
                        shadows: { ...prev.shadows, applyToCards: checked }
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Buttons</Label>
                    <Switch
                      checked={currentTheme.shadows.applyToButtons}
                      onCheckedChange={(checked) => setCurrentTheme(prev => ({
                        ...prev,
                        shadows: { ...prev.shadows, applyToButtons: checked }
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Inputs</Label>
                    <Switch
                      checked={currentTheme.shadows.applyToInputs}
                      onCheckedChange={(checked) => setCurrentTheme(prev => ({
                        ...prev,
                        shadows: { ...prev.shadows, applyToInputs: checked }
                      }))}
                    />
                  </div>
                </div>
              </>
            )}


            <div>
              <Label>Border Radius</Label>
              <Select
                value={currentTheme.borderRadius}
                onValueChange={(value: 'none' | 'sm' | 'md' | 'lg') => setCurrentTheme(prev => ({
                  ...prev,
                  borderRadius: value
                }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (0px)</SelectItem>
                  <SelectItem value="sm">Small (4px)</SelectItem>
                  <SelectItem value="md">Medium (8px)</SelectItem>
                  <SelectItem value="lg">Large (12px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Preview */}
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sample Card */}
            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle>Sample Order</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge>Pending</Badge>
                  <p className="text-sm text-muted-foreground">
                    2025 Honda Accord
                  </p>
                  <Button size="sm" className="w-full">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sample Buttons */}
            <div className="space-y-3">
              <h4 className="font-medium">Button Styles</h4>
              <div className="space-y-2">
                <Button className="w-full button-enhanced">Primary Button</Button>
                <Button variant="outline" className="w-full">Outline Button</Button>
                <Button variant="destructive" className="w-full">Delete Action</Button>
              </div>
            </div>

            {/* Sample Status Badges */}
            <div className="space-y-3">
              <h4 className="font-medium">Status Indicators</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Active</Badge>
                <Badge variant="secondary">Pending</Badge>
                <Badge variant="destructive">Cancelled</Badge>
                <Badge variant="outline">Draft</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}