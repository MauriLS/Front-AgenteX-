import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// var (no let/const) para que sea accesible dentro del factory de vi.mock
// antes de que el módulo-scope haya terminado de inicializarse (hoisting de vi.mock).
var smokeInitialPath = '/';

// ── BrowserRouter → MemoryRouter ───────────────────────────────────────────────
// BrowserRouter necesita window.location.origin (real) para construir URLs.
// MemoryRouter usa historial en memoria → no depende de window.location en absoluto.
// Esto elimina la dependencia del estado de window.location entre archivos de test.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }) => (
      <actual.MemoryRouter initialEntries={[smokeInitialPath || '/']}>
        {children}
      </actual.MemoryRouter>
    ),
  };
});

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('../../lib/apiFetch', () => ({ apiFetch: vi.fn() }));

vi.mock('../../components/dashboard/Dashboard', () => ({
  Dashboard: ({ onNavigate }) => (
    <div>
      Dashboard
      <button onClick={() => onNavigate('bodega')}>ir-agente</button>
      <button onClick={() => onNavigate('history')}>ir-historial</button>
    </div>
  ),
}));
vi.mock('../../components/chat/ChatInterface', () => ({
  ChatInterface: ({ agentId }) => <div>ChatInterface-{agentId}</div>,
}));
vi.mock('../../components/history/SessionHistory', () => ({
  SessionHistory: () => <div>SessionHistory</div>,
}));
vi.mock('../../components/history/SessionDetail', () => ({
  SessionDetail: () => <div>SessionDetail</div>,
}));
vi.mock('../../components/settings/ProfileSettings', () => ({
  ProfileSettings: () => <div>ProfileSettings</div>,
}));
vi.mock('../../components/settings/AgentsSettings', () => ({
  AgentsSettings: () => <div>AgentsSettings</div>,
}));
vi.mock('../../components/settings/CompanySettings', () => ({
  CompanySettings: () => <div>CompanySettings</div>,
}));
vi.mock('../../components/settings/UsersSettings', () => ({
  UsersSettings: () => <div>UsersSettings</div>,
}));
vi.mock('../../components/admin/CompaniesAdmin', () => ({
  CompaniesAdmin: () => <div>CompaniesAdmin</div>,
}));
vi.mock('../../components/auth/Register', () => ({
  RegisterB2B: () => <div>RegisterB2B</div>,
}));
vi.mock('../../components/provisioning/ERPMappingSection', () => ({
  ERPMappingSection: () => null,
}));

// ── helpers ────────────────────────────────────────────────────────────────────
import { apiFetch } from '../../lib/apiFetch';

const loginAs = (role = 'USER') => {
  localStorage.setItem('token', 'jwt-smoke');
  localStorage.setItem('user', JSON.stringify({ id: 1, role }));
};

const mockLoginFetch = (ok = true) => {
  global.fetch.mockResolvedValue({
    ok,
    json: async () =>
      ok
        ? { token: 'jwt-smoke', user: { id: 1, role: 'USER' } }
        : { error: 'Credenciales inválidas. Acceso denegado.' },
  });
};

describe('Smoke — Frontend AgenteX', () => {
  beforeEach(() => {
    smokeInitialPath = '/';
    localStorage.clear();
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    apiFetch.mockResolvedValue({ json: async () => ({ success: true, agents: [] }) });
  });

  // ── Boot ───────────────────────────────────────────────────────────────────
  it('SMOKE-F01: App arranca sin errores en estado no autenticado', () => {
    expect(() => render(<App />)).not.toThrow();
    expect(document.body.innerHTML).not.toBe('');
  });

  // ── LoginScreen ────────────────────────────────────────────────────────────
  it('SMOKE-F02: LoginScreen muestra todos los campos del formulario de acceso', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('u-id@enterprise.x')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /initialize system/i })).toBeInTheDocument();
  });

  it('SMOKE-F03: Login exitoso guarda token en localStorage', async () => {
    mockLoginFetch(true);
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText('u-id@enterprise.x'), 'admin@x.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••••••'), 'pass123');
    fireEvent.click(screen.getByRole('button', { name: /initialize system/i }));

    await waitFor(() => expect(localStorage.getItem('token')).toBe('jwt-smoke'));
  });

  it('SMOKE-F04: Login con credenciales incorrectas muestra error y no crashea', async () => {
    mockLoginFetch(false);
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText('u-id@enterprise.x'), 'bad@x.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••••••'), 'wrong');
    fireEvent.click(screen.getByRole('button', { name: /initialize system/i }));

    expect(await screen.findByText(/Credenciales inválidas/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('u-id@enterprise.x')).toBeInTheDocument();
  });

  it('SMOKE-F05: Error de red en login muestra mensaje y no crashea', async () => {
    global.fetch.mockRejectedValue(new Error('ERR_CONNECTION_REFUSED'));
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText('u-id@enterprise.x'), 'user@x.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••••••'), 'pass');
    fireEvent.click(screen.getByRole('button', { name: /initialize system/i }));

    expect(await screen.findByText(/Fallo crítico de red/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('u-id@enterprise.x')).toBeInTheDocument();
  });

  // ── Auth guard (PrivateRoute) ───────────────────────────────────────────────
  it('SMOKE-F06: Sin token — /app/* redirige a LoginScreen', () => {
    smokeInitialPath = '/app/dashboard';
    render(<App />);
    expect(screen.getByPlaceholderText('u-id@enterprise.x')).toBeInTheDocument();
  });

  // ── Shell autenticado ───────────────────────────────────────────────────────
  it('SMOKE-F07: Con token — / redirige a /app y carga Dashboard por defecto', async () => {
    loginAs();
    render(<App />);
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('SMOKE-F08: Sidebar muestra items de navegación base para cualquier rol', async () => {
    loginAs();
    render(<App />);
    await screen.findByText('Dashboard');

    expect(screen.getByRole('button', { name: 'Control Center' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Historial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configuración' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('SMOKE-F09: Navegación a historial carga SessionHistory sin crashear', async () => {
    loginAs();
    render(<App />);
    await screen.findByText('Dashboard');

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    expect(screen.getByText('SessionHistory')).toBeInTheDocument();
  });

  it('SMOKE-F10: Navegación a tab de agente carga ChatInterface con agentId correcto', async () => {
    loginAs();
    render(<App />);
    await screen.findByText('Dashboard');

    fireEvent.click(screen.getByText('ir-agente'));
    expect(screen.getByText('ChatInterface-bodega')).toBeInTheDocument();
  });

  it('SMOKE-F11: Round-trip de navegación historial → dashboard no deja estado roto', async () => {
    loginAs();
    render(<App />);
    await screen.findByText('Dashboard');

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    expect(screen.getByText('SessionHistory')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Control Center' }));
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  // ── Roles ──────────────────────────────────────────────────────────────────
  it('SMOKE-F12: Rol ADMIN — sección de administración visible y navegable sin crash', async () => {
    loginAs('ADMIN');
    render(<App />);
    await screen.findByText('Dashboard');

    expect(screen.getByRole('button', { name: 'Gestión de Agentes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mi Empresa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usuarios' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Gestión de Agentes' }));
    expect(screen.getByText('AgentsSettings')).toBeInTheDocument();
  });

  it('SMOKE-F13: Rol SUPER_ADMIN — sección super admin visible y navegable sin crash', async () => {
    loginAs('SUPER_ADMIN');
    render(<App />);
    await screen.findByText('Dashboard');

    expect(screen.getByRole('button', { name: 'Aprovisionar Empresa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empresas' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Empresas' }));
    expect(screen.getByText('CompaniesAdmin')).toBeInTheDocument();
  });

  // ── Logout ──────────────────────────────────────────────────────────────────
  it('SMOKE-F14: Logout limpia localStorage y llama a window.location.href', async () => {
    loginAs();
    render(<App />);
    await screen.findByText('Dashboard');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  // ── Rutas desconocidas ────────────────────────────────────────────────────
  it('SMOKE-F15: Ruta desconocida sin token redirige a LoginScreen', () => {
    smokeInitialPath = '/ruta/inexistente/xyz';
    render(<App />);
    expect(screen.getByPlaceholderText('u-id@enterprise.x')).toBeInTheDocument();
  });
});
