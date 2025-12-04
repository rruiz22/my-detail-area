// =====================================================
// TAG COLORS UTILITY
// Created: 2024-12-04
// Description: Utilidad para gestionar colores de tags
// =====================================================

/**
 * Array de colores para tags
 * Cada tag tiene asignado un colorIndex (0-9)
 * que mapea a una de estas clases de Tailwind
 *
 * Diseño Notion-style: colores suaves y profesionales
 */
export const TAG_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',       // 0 - Blue
  'bg-green-100 text-green-700 border-green-200',    // 1 - Green
  'bg-purple-100 text-purple-700 border-purple-200', // 2 - Purple
  'bg-amber-100 text-amber-700 border-amber-200',    // 3 - Amber
  'bg-cyan-100 text-cyan-700 border-cyan-200',       // 4 - Cyan
  'bg-pink-100 text-pink-700 border-pink-200',       // 5 - Pink
  'bg-indigo-100 text-indigo-700 border-indigo-200', // 6 - Indigo
  'bg-emerald-100 text-emerald-700 border-emerald-200', // 7 - Emerald
  'bg-orange-100 text-orange-700 border-orange-200', // 8 - Orange
  'bg-rose-100 text-rose-700 border-rose-200',       // 9 - Rose
] as const;

/**
 * Obtiene las clases CSS de Tailwind para un tag basado en su colorIndex
 *
 * @param colorIndex - Índice del color (0-9)
 * @returns String con las clases de Tailwind CSS
 *
 * @example
 * ```tsx
 * <Badge className={getTagColor(tag.colorIndex)}>
 *   {tag.tagName}
 * </Badge>
 * ```
 */
export function getTagColor(colorIndex: number): string {
  // Ensure index is within bounds usando módulo
  const safeIndex = Math.abs(colorIndex) % TAG_COLORS.length;
  return TAG_COLORS[safeIndex];
}

/**
 * Genera un índice de color aleatorio para un nuevo tag
 *
 * @returns Número entre 0 y 9
 *
 * @example
 * ```ts
 * const newTag = {
 *   name: 'Urgente',
 *   colorIndex: generateRandomColorIndex()
 * };
 * ```
 */
export function generateRandomColorIndex(): number {
  return Math.floor(Math.random() * TAG_COLORS.length);
}

/**
 * Mapeo de nombres de colores a índices
 * Útil para tests o asignaciones específicas
 */
export const COLOR_NAMES = {
  blue: 0,
  green: 1,
  purple: 2,
  amber: 3,
  cyan: 4,
  pink: 5,
  indigo: 6,
  emerald: 7,
  orange: 8,
  rose: 9,
} as const;

export type ColorName = keyof typeof COLOR_NAMES;

/**
 * Obtiene el color por nombre
 *
 * @param colorName - Nombre del color
 * @returns String con las clases de Tailwind CSS
 *
 * @example
 * ```tsx
 * <Badge className={getColorByName('purple')}>
 *   Urgente
 * </Badge>
 * ```
 */
export function getColorByName(colorName: ColorName): string {
  const index = COLOR_NAMES[colorName];
  return TAG_COLORS[index];
}
