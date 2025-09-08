import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to auth page
    await expect(page).toHaveURL(/.*auth/);
    
    // Should show login form
    await expect(page.locator('h1')).toContainText('Iniciar sesión');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should handle login form validation', async ({ page }) => {
    await page.goto('/auth');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=El email es requerido')).toBeVisible();
    await expect(page.locator('text=La contraseña es requerida')).toBeVisible();
  });

  test('should toggle between login and signup', async ({ page }) => {
    await page.goto('/auth');
    
    // Should start with login form
    await expect(page.locator('h1')).toContainText('Iniciar sesión');
    
    // Click to switch to signup
    await page.click('text=¿No tienes cuenta? Regístrate');
    
    // Should show signup form
    await expect(page.locator('h1')).toContainText('Crear cuenta');
    await expect(page.locator('input[placeholder="Nombre completo"]')).toBeVisible();
    
    // Switch back to login
    await page.click('text=¿Ya tienes cuenta? Inicia sesión');
    await expect(page.locator('h1')).toContainText('Iniciar sesión');
  });
});