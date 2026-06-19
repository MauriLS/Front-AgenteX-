import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '../../../lib/apiFetch';

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
    delete window.location;
    window.location = { href: '' };
  });

  it('inyecta Authorization cuando hay token en localStorage', async () => {
    localStorage.setItem('token', 'abc123');
    fetch.mockResolvedValue({ status: 200, ok: true });

    await apiFetch('/api/dashboard');

    const [, config] = fetch.mock.calls[0];
    expect(config.headers.Authorization).toBe('Bearer abc123');
  });

  it('no inyecta Authorization si no hay token', async () => {
    fetch.mockResolvedValue({ status: 200, ok: true });

    await apiFetch('/api/dashboard');

    const [, config] = fetch.mock.calls[0];
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('en 401 limpia localStorage, redirige a /login y lanza error', async () => {
    localStorage.setItem('token', 'expired');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    fetch.mockResolvedValue({ status: 401, ok: false });

    await expect(apiFetch('/api/dashboard')).rejects.toThrow('Sesión expirada');

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('respeta headers personalizados sin perder el default Content-Type', async () => {
    fetch.mockResolvedValue({ status: 200, ok: true });

    await apiFetch('/api/dashboard', { headers: { 'X-Custom': '1' } });

    const [, config] = fetch.mock.calls[0];
    expect(config.headers['Content-Type']).toBe('application/json');
    expect(config.headers['X-Custom']).toBe('1');
  });
});