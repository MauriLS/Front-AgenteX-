import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UsersSettings } from '../../../../components/settings/UsersSettings';
import { apiFetch } from '../../../../lib/apiFetch';

vi.mock('../../../../lib/apiFetch', () => ({ apiFetch: vi.fn() }));

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const makeUser = (id, username, role, email = `${username}@x.com`) => ({
  id, username, role, email, created_at: '2024-01-15T00:00:00Z',
});

const mockEndpoints = (users, meId) => {
  apiFetch.mockImplementation((path) => {
    if (path === '/api/users')    return Promise.resolve({ json: async () => ({ success: true, users }) });
    if (path === '/api/users/me') return Promise.resolve({ json: async () => ({ success: true, user: { id: meId } }) });
    return Promise.reject(new Error(`path no mockeado: ${path}`));
  });
};

describe('UsersSettings', () => {
  let onMenuClick;

  beforeEach(() => {
    onMenuClick = vi.fn();
    apiFetch.mockReset();
  });

  it('muestra "Cargando usuarios..." mientras las promesas están pendientes', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));
    render(<UsersSettings onMenuClick={onMenuClick} />);
    expect(screen.getByText('Cargando usuarios...')).toBeInTheDocument();
  });

  it('lista vacía muestra el mensaje correspondiente', async () => {
    mockEndpoints([], 99);
    render(<UsersSettings onMenuClick={onMenuClick} />);
    expect(await screen.findByText('Sin usuarios registrados.')).toBeInTheDocument();
  });

  it('renderiza usuarios con sus roles y emails', async () => {
    mockEndpoints([
      makeUser(1, 'superadmin', 'SUPER_ADMIN'),
      makeUser(2, 'admin',      'ADMIN'),
      makeUser(3, 'usuario',    'USER'),
    ], 99);

    render(<UsersSettings onMenuClick={onMenuClick} />);

    expect(await screen.findByText('superadmin')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('usuario')).toBeInTheDocument();
  });

  it('rol desconocido usa el fallback USER de ROLE_CONFIG', async () => {
    mockEndpoints([makeUser(1, 'raro', 'UNKNOWN_ROLE')], 99);
    render(<UsersSettings onMenuClick={onMenuClick} />);
    expect(await screen.findByText('raro')).toBeInTheDocument();
    expect(screen.getByText('Usuario')).toBeInTheDocument();
  });

  it('usuario actual (isMe) muestra badge "Tú" y no tiene botón de eliminar', async () => {
    mockEndpoints([makeUser(5, 'yo', 'ADMIN'), makeUser(6, 'otro', 'USER')], 5);
    render(<UsersSettings onMenuClick={onMenuClick} />);

    await screen.findByText('yo');
    expect(screen.getByText('Tú')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar yo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar otro/i })).toBeInTheDocument();
  });

  it('eliminar usuario exitoso lo remueve de la lista', async () => {
    mockEndpoints([makeUser(1, 'admin', 'ADMIN'), makeUser(2, 'otro', 'USER')], 1);
    apiFetch.mockImplementation((path, opts) => {
      if (opts?.method === 'DELETE') return Promise.resolve({ ok: true, json: async () => ({}) });
      if (path === '/api/users')    return Promise.resolve({ json: async () => ({ success: true, users: [makeUser(1,'admin','ADMIN'), makeUser(2,'otro','USER')] }) });
      if (path === '/api/users/me') return Promise.resolve({ json: async () => ({ success: true, user: { id: 1 } }) });
    });

    render(<UsersSettings onMenuClick={onMenuClick} />);
    await screen.findByText('otro');

    fireEvent.click(screen.getByRole('button', { name: /eliminar otro/i }));

    await waitFor(() => expect(screen.queryByText('otro')).not.toBeInTheDocument());
  });

  it('delete con res.ok=false muestra el error del backend', async () => {
    mockEndpoints([makeUser(1, 'admin', 'ADMIN'), makeUser(2, 'otro', 'USER')], 1);
    apiFetch.mockImplementation((path, opts) => {
      if (opts?.method === 'DELETE') return Promise.resolve({ ok: false, json: async () => ({ error: 'Sin permisos.' }) });
      if (path === '/api/users')    return Promise.resolve({ json: async () => ({ success: true, users: [makeUser(1,'admin','ADMIN'), makeUser(2,'otro','USER')] }) });
      if (path === '/api/users/me') return Promise.resolve({ json: async () => ({ success: true, user: { id: 1 } }) });
    });

    render(<UsersSettings onMenuClick={onMenuClick} />);
    await screen.findByText('otro');

    fireEvent.click(screen.getByRole('button', { name: /eliminar otro/i }));

    expect(await screen.findByText(/Sin permisos\./)).toBeInTheDocument();
    expect(screen.getByText('otro')).toBeInTheDocument();
  });
});
