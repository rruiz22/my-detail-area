/**
 * Service Badge Component
 *
 * Displays service names with color-coded badges from category colors
 * Follows Notion design system: flat colors, no gradients, muted palette
 *
 * Features:
 * - Category color support (from service_categories table)
 * - Automatic color validation (ensures Notion-style muted colors)
 * - Fallback to gray-500 for services without category
 * - Multiple size variants (sm, md, lg)
 * - Optional icon display
 * - Accessible color contrast
 * - Tooltip with service details on hover (description, price, duration)
 */

import { Badge } from '@/components/ui/badge';
import { ServiceTooltip } from './ServiceTooltip';
import { cn } from '@/lib/utils';
import { Wrench, type LucideIcon } from 'lucide-react';

interface ServiceBadgeProps {
  serviceName: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  icon?: LucideIcon;
  // Tooltip props
  description?: string;
  price?: number;
  duration?: number;
  categoryName?: string;
  showTooltip?: boolean;
  showPricing?: boolean;
}

/**
 * Validates and adjusts color to ensure Notion-style muted appearance
 * Prevents bright/saturated colors and gradients
 */
const validateNotionColor = (color: string | undefined): string => {
  // Default fallback: Gray-500 (muted, neutral)
  const fallbackColor = '#6B7280';

  if (!color) return fallbackColor;

  // Convert color to lowercase for comparison
  const normalizedColor = color.toLowerCase().trim();

  // ❌ Block forbidden patterns (gradients, bright colors)
  const forbiddenPatterns = [
    'gradient',
    'linear-gradient',
    'radial-gradient',
    'conic-gradient',
    '#0066cc', // Strong blue
    '#0099ff', // Bright blue
    '#3366ff', // Vivid blue
    '#00ff',   // Neon colors
    '#ff00',   // Neon colors
  ];

  if (forbiddenPatterns.some(pattern => normalizedColor.includes(pattern))) {
    return fallbackColor;
  }

  // ✅ Approved Notion color palette (muted, flat)
  const approvedColors: Record<string, string> = {
    // Grays (foundation)
    'gray': '#6B7280',
    'slate': '#64748B',

    // Muted accents
    'emerald': '#10B981',
    'green': '#10B981',
    'amber': '#F59E0B',
    'yellow': '#F59E0B',
    'red': '#EF4444',
    'rose': '#EF4444',
    'indigo': '#6366F1',
    'purple': '#8B5CF6',
    'blue': '#6366F1',  // Muted indigo instead of bright blue
    'orange': '#F97316',
    'teal': '#14B8A6',
    'cyan': '#06B6D4',
  };

  // Check if it's a named color from approved palette
  for (const [name, hex] of Object.entries(approvedColors)) {
    if (normalizedColor.includes(name)) {
      return hex;
    }
  }

  // If it's a hex color, validate it's properly formatted
  if (normalizedColor.startsWith('#')) {
    // Valid hex: #RGB or #RRGGBB
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexPattern.test(normalizedColor)) {
      return normalizedColor;
    }
  }

  // If validation fails, use fallback
  return fallbackColor;
};

/**
 * Generates background and text colors with high contrast (Notion-style)
 * Returns { bg, text, border } with strong visibility
 */
const getNotionColors = (baseColor: string): { bg: string; text: string; border: string } => {
  // Parse hex color
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Background: 85% white + 15% color (más visible que antes)
  const bgMix = (value: number) => Math.round(value * 0.15 + 255 * 0.85);
  const bgR = bgMix(r).toString(16).padStart(2, '0');
  const bgG = bgMix(g).toString(16).padStart(2, '0');
  const bgB = bgMix(b).toString(16).padStart(2, '0');
  const bg = `#${bgR}${bgG}${bgB}`;

  // Text: Usar el color base (más oscuro para mejor contraste)
  const textMix = (value: number) => Math.round(value * 0.7); // 70% del color original
  const textR = textMix(r).toString(16).padStart(2, '0');
  const textG = textMix(g).toString(16).padStart(2, '0');
  const textB = textMix(b).toString(16).padStart(2, '0');
  const text = `#${textR}${textG}${textB}`;

  // Border: Color base (fuerte)
  const border = baseColor;

  return { bg, text, border };
};

export function ServiceBadge({
  serviceName,
  color,
  size = 'md',
  showIcon = true,
  className,
  icon: CustomIcon,
  description,
  price,
  duration,
  categoryName,
  showTooltip = true,
  showPricing = true,
}: ServiceBadgeProps) {
  // Validate and generate Notion-style colors with better contrast
  const validatedColor = validateNotionColor(color);
  const colors = getNotionColors(validatedColor);

  // Size configurations with better padding
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-1 gap-1 font-semibold',
    md: 'text-xs px-2.5 py-1.5 gap-1.5 font-semibold',
    lg: 'text-sm px-3 py-2 gap-2 font-semibold',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const Icon = CustomIcon || Wrench;

  const badgeElement = (
    <Badge
      variant="outline"
      className={cn(
        'border transition-all inline-flex items-center shadow-sm',
        'rounded-sm', // Match status badge border-radius
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      {showIcon && <Icon className={iconSizeClasses[size]} style={{ color: colors.border }} />}
      <span className="truncate">{serviceName}</span>
    </Badge>
  );

  // Wrap with tooltip if enabled and service has details
  if (showTooltip && (description || price || duration)) {
    return (
      <ServiceTooltip
        service={{
          name: serviceName,
          description,
          price,
          duration,
          category_name: categoryName,
          category_color: color,
        }}
        showPricing={showPricing}
      >
        {badgeElement}
      </ServiceTooltip>
    );
  }

  return badgeElement;
}

/**
 * Helper function to render multiple service badges
 * Handles overflow with "+N more" indicator
 */
interface ServiceBadgesGroupProps {
  services: Array<{ name: string; category_color?: string }>;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcons?: boolean;
  className?: string;
}

export function ServiceBadgesGroup({
  services,
  maxVisible = 3,
  size = 'md',
  showIcons = true,
  className,
}: ServiceBadgesGroupProps) {
  const visibleServices = services.slice(0, maxVisible);
  const remainingCount = services.length - maxVisible;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-1 gap-1 font-semibold',
    md: 'text-xs px-2.5 py-1.5 gap-1.5 font-semibold',
    lg: 'text-sm px-3 py-2 gap-2 font-semibold',
  };

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visibleServices.map((service) => (
        <ServiceBadge
          key={service.name}
          serviceName={service.name}
          color={service.category_color}
          size={size}
          showIcon={showIcons}
        />
      ))}
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className={cn(
            'font-medium border border-gray-300 bg-gray-50 text-gray-600',
            sizeClasses[size]
          )}
        >
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}
