import React from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  Wrench,
  Hammer,
  Sparkles,
  CheckCircle2,
  Circle,
  Layers,
  Settings,
  ClipboardCheck,
  Package,
  Truck,
  Car,
  Droplet,
  Paintbrush,
  Gauge,
  ShieldCheck,
  Zap,
  Flag,
  Target,
  Award,
  LucideIcon,
} from 'lucide-react';
import { Label } from '@/components/ui/label';

export interface IconOption {
  name: string;
  icon: LucideIcon;
  label: string;
}

export const AVAILABLE_ICONS: IconOption[] = [
  { name: 'search', icon: Search, label: 'Search' },
  { name: 'wrench', icon: Wrench, label: 'Wrench' },
  { name: 'hammer', icon: Hammer, label: 'Hammer' },
  { name: 'sparkles', icon: Sparkles, label: 'Sparkles' },
  { name: 'check', icon: CheckCircle2, label: 'Check' },
  { name: 'circle', icon: Circle, label: 'Circle' },
  { name: 'layers', icon: Layers, label: 'Layers' },
  { name: 'settings', icon: Settings, label: 'Settings' },
  { name: 'clipboard', icon: ClipboardCheck, label: 'Clipboard' },
  { name: 'package', icon: Package, label: 'Package' },
  { name: 'truck', icon: Truck, label: 'Truck' },
  { name: 'car', icon: Car, label: 'Car' },
  { name: 'droplet', icon: Droplet, label: 'Droplet' },
  { name: 'paintbrush', icon: Paintbrush, label: 'Paintbrush' },
  { name: 'gauge', icon: Gauge, label: 'Gauge' },
  { name: 'shield', icon: ShieldCheck, label: 'Shield' },
  { name: 'zap', icon: Zap, label: 'Zap' },
  { name: 'flag', icon: Flag, label: 'Flag' },
  { name: 'target', icon: Target, label: 'Target' },
  { name: 'award', icon: Award, label: 'Award' },
];

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
}

export function IconPicker({ value, onChange, label }: IconPickerProps) {
  const selectedIcon = AVAILABLE_ICONS.find((icon) => icon.name === value);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      {/* Selected Icon Preview */}
      {selectedIcon && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <selectedIcon.icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedIcon.label}
          </span>
        </div>
      )}

      {/* Icon Grid */}
      <div className="grid grid-cols-5 gap-2 p-3 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        {AVAILABLE_ICONS.map((iconOption) => {
          const Icon = iconOption.icon;
          const isSelected = value === iconOption.name;

          return (
            <button
              key={iconOption.name}
              type="button"
              onClick={() => onChange(iconOption.name)}
              className={cn(
                'flex items-center justify-center p-3 rounded-md transition-all hover:bg-gray-100 dark:hover:bg-gray-800',
                isSelected
                  ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary ring-2 ring-primary/20'
                  : 'border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-700'
              )}
              title={iconOption.label}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  isSelected
                    ? 'text-primary'
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100'
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
