import { test, expect } from '@playwright/test';
import { mockApi, loginAsAdmin, ADMIN_USER } from './mocks.js';

test.describe('E2E — Autenticación', () => {
  test('E2E-A01: login exitoso redirige a /app y muestra el dashboard', async ({ page }) => {
    await mockApi(page);
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ token: 'jwt-e2e-test', user: ADMIN_USER }),
      })
    );

    await page.goto('/login');
    await page.locator('input[type="email"]').fill('admin@agentex.test');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /initialize system/i }).click();

    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByText(/Bienvenido, admin\.demo/)).toBeVisible();
  });

  test('E2E-A02: credenciales inválidas muestra mensaje de error y no navega', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Credenciales inválidas. Acceso denegado.' }),
      })
    );

    await page.goto('/login');
    await page.locator('input[type="email"]').fill('admin@agentex.test');
    await page.locator('input[type="password"]').fill('wrong');
    await page.getByRole('button', { name: /initialize system/i }).click();

    await expect(page.getByText(/Credenciales inválidas/)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('E2E-A03: acceso a /app sin token redirige a /login', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login/);
  });

  test('E2E-A04: logout limpia la sesión y redirige a /login', async ({ page }) => {
    await mockApi(page);
    await loginAsAdmin(page);

    await page.goto('/app');
    await expect(page.getByText(/Bienvenido, admin\.demo/)).toBeVisible();

    await page.getByRole('button', { name: /cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login/);

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });
});
