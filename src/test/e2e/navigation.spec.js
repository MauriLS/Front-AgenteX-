import { test, expect } from '@playwright/test';
import { mockApi, loginAsAdmin } from './mocks.js';

test.describe('E2E — Navegación', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await loginAsAdmin(page);
    await page.goto('/app');
    await expect(page.getByText(/Bienvenido/)).toBeVisible();
  });

  test('E2E-N01: sidebar lista agentes dinámicos y navega a un agente', async ({ page }) => {
    await page.getByRole('button', { name: 'Agente Bodega' }).click();
    await expect(page.getByText(/CHANNEL: OPS-BODEGA-COMMAND/)).toBeVisible();
  });

  test('E2E-N02: navega a Historial, abre una sesión y vuelve a la lista', async ({ page }) => {
    await page.getByRole('button', { name: 'Historial' }).click();
    await expect(page.getByText('Historial de conversaciones')).toBeVisible();
    await expect(page.getByText(/bodega · sesión #101/)).toBeVisible();

    await page.getByText(/bodega · sesión #101/).click();
    await expect(page.getByText('Sesión #101')).toBeVisible();

    // Botón "Historial" de vuelta está en el <header> de SessionDetail;
    // el del sidebar también se llama "Historial" — hay que desambiguar por contenedor.
    await page.locator('header').getByRole('button', { name: /historial/i }).click();
    await expect(page.getByText('Historial de conversaciones')).toBeVisible();
  });

  test('E2E-N03: rol ADMIN ve la sección de administración en el sidebar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Gestión de Agentes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mi Empresa' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Usuarios' })).toBeVisible();
  });
});
