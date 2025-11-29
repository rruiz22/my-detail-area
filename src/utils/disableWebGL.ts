/**
 * Disable WebGL Globally
 *
 * This file MUST be imported BEFORE face-api.js to prevent WebGL backend errors.
 * It blocks ALL WebGL context creation, forcing TensorFlow.js to use CPU backend.
 *
 * WHY: face-api.js has hardcoded WebGL references that cause
 * "Cannot read properties of undefined (reading 'backend')" errors
 * when multiple instances try to use the same WebGL context.
 *
 * SOLUTION: Block WebGL at the browser API level BEFORE any library loads.
 */

import * as logger from './logger';

if (typeof window !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
  logger.dev('[WebGL Blocker] Installing WebGL context blocker...');

  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function(
    contextType: string,
    ...args: any[]
  ): RenderingContext | null {
    // Block WebGL and WebGL2 contexts completely
    if (contextType === 'webgl' || contextType === 'webgl2') {
      logger.dev(`[WebGL Blocker] Blocked ${contextType} context creation - forcing CPU fallback`);
      return null; // Force TensorFlow.js to use CPU backend
    }

    // Allow all other contexts (2d, bitmaprenderer, etc.)
    return originalGetContext.apply(this, [contextType, ...args] as any);
  };

  logger.dev('[WebGL Blocker] ✓ WebGL contexts will be blocked (CPU-only mode)');
}

// Export empty object to make this a module
export {};
