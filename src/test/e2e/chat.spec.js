import { test, expect } from '@playwright/test';
import { mockApi, loginAsAdmin } from './mocks.js';

test.describe('E2E — Chat', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await loginAsAdmin(page);
    await page.goto('/app');
    await expect(page.getByText(/Bienvenido/)).toBeVisible();
    await page.getByRole('button', { name: 'Agente Bodega' }).click();
  });

  test('E2E-CH01: enviar mensaje muestra la respuesta del agente', async ({ page }) => {
    await page.route('**/api/chat/message', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'Stock disponible: 120 unidades.', session_chat_id: 'sess-e2e-1' }),
      })
    );

    await page.getByPlaceholder('Escribe tu consulta...').fill('¿Cuánto stock hay?');
    await page.getByRole('button', { name: /execute/i }).click();

    await expect(page.getByText('¿Cuánto stock hay?')).toBeVisible();
    await expect(page.getByText('Stock disponible: 120 unidades.')).toBeVisible();
    await expect(page.getByText(/SESSION_ID: sess-e2e-1/)).toBeVisible();
  });

  test('E2E-CH02: error 401 durante el chat cierra sesión y redirige a login', async ({ page }) => {
    await page.route('**/api/chat/message', (route) => route.fulfill({ status: 401 }));

    await page.getByPlaceholder('Escribe tu consulta...').fill('consulta cualquiera');
    await page.getByRole('button', { name: /execute/i }).click();

    await expect(page).toHaveURL(/\/login/);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });
});
