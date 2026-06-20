// Seguridad — Token manipulado / expirado
//
// El cliente nunca decodifica ni valida el JWT — confía ciegamente en lo que
// haya en localStorage y deja que el backend sea la única fuente de verdad
// (rechaza con 401 si el token es inválido, expiró o fue alterado). Esta
// suite fija ese contrato en los dos lugares donde vive la lógica de sesión:
// `apiFetch` (wrapper centralizado) y el flujo de chat (que usa fetch directo
// con su propio manejo de 401, ver ChatInterface.jsx líneas 155-160).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '../../lib/apiFetch';

describe('Seguridad — token manipulado/expirado vía apiFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
    delete window.location;
    window.location = { href: '' };
  });

  it('un token con formato corrupto se envía igual — el cliente no lo valida, el backend decide', async () => {
    const tokenCorrupto = 'eyJhbGciOiJIUzI1NiJ9.MANIPULADO.firma-invalida';
    localStorage.setItem('token', tokenCorrupto);
    fetch.mockResolvedValue({ status: 200, ok: true });

    await apiFetch('/api/users/me');

    const [, config] = fetch.mock.calls[0];
    expect(config.headers.Authorization).toBe(`Bearer ${tokenCorrupto}`);
  });

  it('tras un 401, la siguiente llamada ya NO arrastra el token purgado', async () => {
    localStorage.setItem('token', 'jwt-viejo');
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'ADMIN' }));

    fetch.mockResolvedValueOnce({ status: 401, ok: false });
    await expect(apiFetch('/api/users/me')).rejects.toThrow('Sesión expirada');

    expect(localStorage.getItem('token')).toBeNull();

    fetch.mockResolvedValueOnce({ status: 200, ok: true });
    await apiFetch('/api/sessions/stats');

    const [, config] = fetch.mock.calls[1];
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('un 401 limpia el rol guardado — no puede quedar un rol ADMIN "fantasma" en localStorage', async () => {
    localStorage.setItem('token', 'jwt-viejo');
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'SUPER_ADMIN' }));
    fetch.mockResolvedValue({ status: 401, ok: false });

    await expect(apiFetch('/api/admin/companies')).rejects.toThrow();

    expect(localStorage.getItem('user')).toBeNull();
    expect(JSON.parse(localStorage.getItem('user') || 'null')?.role).toBeUndefined();
  });
});