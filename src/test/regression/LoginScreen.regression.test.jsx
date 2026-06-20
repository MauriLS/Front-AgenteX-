// Regresión — BUG-FE-01
//
// Bug histórico (commit 3e5df05, "fix(prod): corregir configuración de entorno
// y routing en producción"): el bloque de error de LoginScreen estaba duplicado
// en el JSX — dos <div> idénticos envueltos en el mismo `{errorMsg && (...)}`,
// uno justo debajo del otro. El usuario veía el mensaje "[!] Credenciales
// inválidas..." renderizado dos veces en pantalla.
//
// Este test replica exactamente ese escenario (login fallido) y verifica que
// el mensaje de error aparece una sola vez, para evitar que la duplicación
// se reintroduzca en el futuro.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from '../../components/auth/LoginScreen';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
}));

describe('Regresión — BUG-FE-01: mensaje de error duplicado en LoginScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it('credenciales inválidas renderiza el mensaje de error UNA sola vez', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Credenciales inválidas. Acceso denegado.' }),
    });

    render(<LoginScreen onLogin={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('u-id@enterprise.x'), 'admin@x.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••••••'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /initialize system/i }));

    const mensajesError = await screen.findAllByText(/\[!\] Credenciales inválidas\. Acceso denegado\./);
    expect(mensajesError).toHaveLength(1);
  });

  it('fallo de red renderiza el mensaje de error UNA sola vez', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    render(<LoginScreen onLogin={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('u-id@enterprise.x'), 'admin@x.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••••••'), '1234');
    await userEvent.click(screen.getByRole('button', { name: /initialize system/i }));

    const mensajesError = await screen.findAllByText(/\[!\] Fallo crítico de red\. Servidor no responde\./);
    expect(mensajesError).toHaveLength(1);
  });
});
