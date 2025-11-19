/**
 * PDF DESIGN SYSTEM - Notion-Inspired Professional Templates
 * Created: 2025-01-18
 * Description: Central design system for all PDF exports with Notion-style aesthetics
 *
 * Design Principles:
 * - Flat colors only (NO gradients)
 * - Gray-based foundation with muted accents
 * - Clean typography with proper hierarchy
 * - Professional, enterprise-ready layouts
 */

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBTuple extends Array<number> {
  0: number;
  1: number;
  2: number;
  length: 3;
}

export interface ColorPalette {
  rgb: RGBTuple;
  hex: string;
}

export interface FontConfig {
  family: 'helvetica' | 'courier' | 'times';
  size: number;
  style: 'normal' | 'bold' | 'italic' | 'bolditalic';
}

export interface SpacingScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TableStyles {
  headStyles: {
    fillColor: RGBTuple;
    textColor: RGBTuple;
    fontSize: number;
    fontStyle: 'bold' | 'normal';
    halign: 'left' | 'center' | 'right';
  };
  bodyStyles: {
    fontSize: number;
    textColor: RGBTuple;
    cellPadding: number;
  };
  alternateRowStyles: {
    fillColor: RGBTuple;
  };
  footStyles: {
    fillColor: RGBTuple;
    textColor: RGBTuple;
    fontSize: number;
    fontStyle: 'bold' | 'normal';
  };
}

// =====================================================
// NOTION-STYLE COLOR PALETTE
// =====================================================

/**
 * Notion-inspired color palette
 * - Gray foundation (50-900)
 * - Muted accents only (emerald, amber, red, indigo)
 * - NO bright blues, NO gradients
 */
export const PDF_COLORS = {
  // Gray Scale Foundation
  gray: {
    50: { rgb: [249, 250, 251] as RGBTuple, hex: '#f9fafb' },
    100: { rgb: [243, 244, 246] as RGBTuple, hex: '#f3f4f6' },
    200: { rgb: [229, 231, 235] as RGBTuple, hex: '#e5e7eb' },
    300: { rgb: [209, 213, 219] as RGBTuple, hex: '#d1d5db' },
    400: { rgb: [156, 163, 175] as RGBTuple, hex: '#9ca3af' },
    500: { rgb: [107, 114, 128] as RGBTuple, hex: '#6b7280' },
    600: { rgb: [75, 85, 99] as RGBTuple, hex: '#4b5563' },
    700: { rgb: [55, 65, 81] as RGBTuple, hex: '#374151' },
    800: { rgb: [31, 41, 55] as RGBTuple, hex: '#1f2937' },
    900: { rgb: [17, 24, 39] as RGBTuple, hex: '#111827' },
  },

  // Muted Accent Colors (Notion-Approved)
  emerald: {
    500: { rgb: [16, 185, 129] as RGBTuple, hex: '#10b981' },
    600: { rgb: [5, 150, 105] as RGBTuple, hex: '#059669' },
  },

  amber: {
    500: { rgb: [245, 158, 11] as RGBTuple, hex: '#f59e0b' },
    600: { rgb: [217, 119, 6] as RGBTuple, hex: '#d97706' },
  },

  red: {
    500: { rgb: [239, 68, 68] as RGBTuple, hex: '#ef4444' },
    600: { rgb: [220, 38, 38] as RGBTuple, hex: '#dc2626' },
  },

  indigo: {
    500: { rgb: [99, 102, 241] as RGBTuple, hex: '#6366f1' },
    600: { rgb: [79, 70, 229] as RGBTuple, hex: '#4f46e5' },
  },

  // Semantic Colors
  white: { rgb: [255, 255, 255] as RGBTuple, hex: '#ffffff' },
  black: { rgb: [0, 0, 0] as RGBTuple, hex: '#000000' },
} as const;

// =====================================================
// TYPOGRAPHY SYSTEM
// =====================================================

/**
 * Typography scale with clear hierarchy
 * Font sizes optimized for PDF readability
 */
export const PDF_TYPOGRAPHY = {
  // Display styles
  display: {
    family: 'helvetica' as const,
    size: 28,
    style: 'bold' as const,
  },

  // Title styles
  title: {
    family: 'helvetica' as const,
    size: 24,
    style: 'bold' as const,
  },

  // Heading styles
  h1: {
    family: 'helvetica' as const,
    size: 20,
    style: 'bold' as const,
  },
  h2: {
    family: 'helvetica' as const,
    size: 16,
    style: 'bold' as const,
  },
  h3: {
    family: 'helvetica' as const,
    size: 14,
    style: 'bold' as const,
  },
  h4: {
    family: 'helvetica' as const,
    size: 12,
    style: 'bold' as const,
  },

  // Body styles
  body: {
    family: 'helvetica' as const,
    size: 10,
    style: 'normal' as const,
  },
  bodyBold: {
    family: 'helvetica' as const,
    size: 10,
    style: 'bold' as const,
  },

  // Small styles
  small: {
    family: 'helvetica' as const,
    size: 9,
    style: 'normal' as const,
  },
  smallBold: {
    family: 'helvetica' as const,
    size: 9,
    style: 'bold' as const,
  },

  // Caption styles
  caption: {
    family: 'helvetica' as const,
    size: 8,
    style: 'normal' as const,
  },
  captionBold: {
    family: 'helvetica' as const,
    size: 8,
    style: 'bold' as const,
  },

  // Fine print
  finePrint: {
    family: 'helvetica' as const,
    size: 7,
    style: 'normal' as const,
  },

  // Monospace (for VIN, codes)
  mono: {
    family: 'courier' as const,
    size: 9,
    style: 'normal' as const,
  },
  monoBold: {
    family: 'courier' as const,
    size: 9,
    style: 'bold' as const,
  },
} as const;

// =====================================================
// SPACING SYSTEM
// =====================================================

/**
 * Spacing scale in millimeters
 * Based on 4pt grid system (1mm ≈ 2.83pt)
 */
export const PDF_SPACING: SpacingScale = {
  xs: 2,   // 6pt
  sm: 4,   // 11pt
  md: 8,   // 23pt
  lg: 12,  // 34pt
  xl: 16,  // 45pt
  '2xl': 24, // 68pt
} as const;

// =====================================================
// LAYOUT SYSTEM
// =====================================================

/**
 * Page margins and safe zones
 */
export const PDF_MARGINS: Margins = {
  top: 20,     // Top margin
  right: 20,   // Right margin
  bottom: 25,  // Bottom margin (extra space for footer)
  left: 20,    // Left margin
} as const;

/**
 * Page dimensions (A4)
 */
export const PDF_PAGE = {
  a4: {
    portrait: {
      width: 210,  // mm
      height: 297, // mm
    },
    landscape: {
      width: 297,  // mm
      height: 210, // mm
    },
  },
  letter: {
    portrait: {
      width: 215.9, // mm (8.5")
      height: 279.4, // mm (11")
    },
    landscape: {
      width: 279.4, // mm (11")
      height: 215.9, // mm (8.5")
    },
  },
} as const;

// =====================================================
// TABLE STYLING
// =====================================================

/**
 * Professional table styles with Notion aesthetics
 */
export const PDF_TABLE_STYLES: TableStyles = {
  headStyles: {
    fillColor: PDF_COLORS.gray[700].rgb,
    textColor: PDF_COLORS.white.rgb,
    fontSize: 10,
    fontStyle: 'bold',
    halign: 'left',
  },
  bodyStyles: {
    fontSize: 9,
    textColor: PDF_COLORS.gray[900].rgb,
    cellPadding: 4,
  },
  alternateRowStyles: {
    fillColor: PDF_COLORS.gray[50].rgb,
  },
  footStyles: {
    fillColor: PDF_COLORS.gray[100].rgb,
    textColor: PDF_COLORS.gray[900].rgb,
    fontSize: 10,
    fontStyle: 'bold',
  },
} as const;

// =====================================================
// COMPONENT STYLES
// =====================================================

/**
 * Reusable component styling configurations
 */
export const PDF_COMPONENTS = {
  // Badge styles
  badge: {
    success: {
      fillColor: PDF_COLORS.emerald[500].rgb,
      textColor: PDF_COLORS.white.rgb,
      borderRadius: 2,
      padding: { x: 4, y: 2 },
    },
    warning: {
      fillColor: PDF_COLORS.amber[500].rgb,
      textColor: PDF_COLORS.white.rgb,
      borderRadius: 2,
      padding: { x: 4, y: 2 },
    },
    error: {
      fillColor: PDF_COLORS.red[500].rgb,
      textColor: PDF_COLORS.white.rgb,
      borderRadius: 2,
      padding: { x: 4, y: 2 },
    },
    info: {
      fillColor: PDF_COLORS.indigo[500].rgb,
      textColor: PDF_COLORS.white.rgb,
      borderRadius: 2,
      padding: { x: 4, y: 2 },
    },
    default: {
      fillColor: PDF_COLORS.gray[500].rgb,
      textColor: PDF_COLORS.white.rgb,
      borderRadius: 2,
      padding: { x: 4, y: 2 },
    },
  },

  // Divider styles
  divider: {
    color: PDF_COLORS.gray[200].rgb,
    thickness: 0.5,
    margin: PDF_SPACING.md,
  },

  // Box/Card styles
  box: {
    borderColor: PDF_COLORS.gray[200].rgb,
    borderWidth: 0.5,
    backgroundColor: PDF_COLORS.white.rgb,
    padding: PDF_SPACING.md,
  },

  // Highlight box
  highlightBox: {
    borderColor: PDF_COLORS.gray[300].rgb,
    borderWidth: 1,
    backgroundColor: PDF_COLORS.gray[50].rgb,
    padding: PDF_SPACING.lg,
  },
} as const;

// =====================================================
// UTILITY CONSTANTS
// =====================================================

/**
 * Border radius values (in mm)
 */
export const PDF_BORDER_RADIUS = {
  none: 0,
  sm: 1,
  md: 2,
  lg: 3,
  full: 999,
} as const;

/**
 * Line heights (multipliers)
 */
export const PDF_LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
} as const;

/**
 * Default configuration export
 */
export const PDF_DESIGN = {
  colors: PDF_COLORS,
  typography: PDF_TYPOGRAPHY,
  spacing: PDF_SPACING,
  margins: PDF_MARGINS,
  page: PDF_PAGE,
  table: PDF_TABLE_STYLES,
  components: PDF_COMPONENTS,
  borderRadius: PDF_BORDER_RADIUS,
  lineHeight: PDF_LINE_HEIGHT,
} as const;

// =====================================================
// TYPE EXPORTS
// =====================================================

export type PDFDesignSystem = typeof PDF_DESIGN;
export type PDFColorPalette = typeof PDF_COLORS;
export type PDFTypography = typeof PDF_TYPOGRAPHY;
export type PDFSpacing = typeof PDF_SPACING;
export type PDFTableStyles = typeof PDF_TABLE_STYLES;
