import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from '../../../../components/auth/LoginScreen';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
}));

describe('LoginScreen', () => {
  let onLogin;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
    onLogin = vi.fn();
  });

  const fillAndSubmit = async (email = 'admin@x.com', password = '1234') => {
    await userEvent.type(screen.getByPlaceholderText('u-id@enterprise.x'), email);
    await userEvent.type(screen.getByPlaceholderText('••••••••••••'), password);
    await userEvent.click(screen.getByRole('button', { name: /initialize system/i }));
  };

  it('login exitoso guarda token/user y llama onLogin', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'jwt-abc', user: { id: 1, role: 'ADMIN' } }),
    });

    render(<LoginScreen onLogin={onLogin} />);
    await fillAndSubmit();

    await waitFor(() => expect(onLogin).toHaveBeenCalled());
    expect(localStorage.getItem('token')).toBe('jwt-abc');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 1, role: 'ADMIN' });
  });

  it('credenciales inválidas muestra el mensaje de error del backend', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Credenciales inválidas. Acceso denegado.' }),
    });

    render(<LoginScreen onLogin={onLogin} />);
    await fillAndSubmit();

    expect(await screen.findByText(/Credenciales inválidas/)).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('fallo de red muestra mensaje genérico', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    render(<LoginScreen onLogin={onLogin} />);
    await fillAndSubmit();

    expect(await screen.findByText(/Fallo crítico de red/)).toBeInTheDocument();
  });

  it('deshabilita el botón mientras isLoading es true', async () => {
    let resolveFetch;
    fetch.mockImplementation(() => new Promise((res) => { resolveFetch = res; }));

    render(<LoginScreen onLogin={onLogin} />);
    await fillAndSubmit();

    expect(screen.getByRole('button', { name: /authenticating/i })).toBeDisabled();

    resolveFetch({ ok: true, json: async () => ({ token: 't' }) });
    await waitFor(() => expect(onLogin).toHaveBeenCalled());
  });
});
