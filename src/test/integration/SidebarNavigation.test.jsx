import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Sidebar } from '../../components/layout/Sidebar';

// apiFetch NO se mockea como módulo — se deja fluir al global.fetch mockeado.
// Esto verifica la cadena real: componente → apiFetch → fetch con header Authorization.

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const makeAgent = (instanceId, templateId, name) => ({ instanceId, templateId, name });

describe('Integración — Sidebar + apiFetch', () => {
  let onNavigate, onClose;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'jwt-test');
    global.fetch = vi.fn();
    onNavigate = vi.fn();
    onClose    = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const mockAgentsApi = (agents = []) => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, agents }),
    });
  };

  it('INT-S01: apiFetch inyecta el token de localStorage en el header Authorization', async () => {
    localStorage.setItem('token', 'secreto-abc');
    mockAgentsApi();

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const [, config] = fetch.mock.calls[0];
    expect(config.headers.Authorization).toBe('Bearer secreto-abc');
  });

  it('INT-S02: la URL de la petición contiene /api/agents/my-agents', async () => {
    mockAgentsApi();

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const [url] = fetch.mock.calls[0];
    expect(url).toContain('/api/agents/my-agents');
  });

  it('INT-S03: agentes devueltos por la API aparecen como items de navegación', async () => {
    mockAgentsApi([
      makeAgent('1', 'bodega',    'Agente Bodega'),
      makeAgent('2', 'ventas',    'Agente Ventas'),
      makeAgent('3', 'analitica', 'Agente Analítica'),
    ]);

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);

    expect(await screen.findByText('Agente Bodega')).toBeInTheDocument();
    expect(screen.getByText('Agente Ventas')).toBeInTheDocument();
    expect(screen.getByText('Agente Analítica')).toBeInTheDocument();
  });

  it('INT-S04: clic en agente dinámico llama onNavigate con el templateId correcto', async () => {
    mockAgentsApi([makeAgent('1', 'analitica', 'Agente Analítica')]);

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Agente Analítica' }));

    expect(onNavigate).toHaveBeenCalledWith('analitica');
  });

  it('INT-S05: sin token la petición se hace sin header Authorization', async () => {
    localStorage.removeItem('token');
    mockAgentsApi([]);

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const [, config] = fetch.mock.calls[0];
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('INT-S06: API sin agentes muestra "Sin agentes activos" sin romper el Sidebar', async () => {
    mockAgentsApi([]);

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);

    expect(await screen.findByText('Sin agentes activos')).toBeInTheDocument();
    expect(screen.getByText('Control Center')).toBeInTheDocument();
  });

  it('INT-S07: error de red no rompe el Sidebar ni la navegación base', async () => {
    global.fetch.mockRejectedValue(new Error('ERR_CONNECTION_REFUSED'));

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);

    expect(await screen.findByText('Sin agentes activos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Control Center' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Historial' })).toBeInTheDocument();
  });

  it('INT-S08: rol ADMIN — agentes dinámicos y sección de admin coexisten', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'ADMIN' }));
    mockAgentsApi([makeAgent('1', 'bodega', 'Agente Bodega')]);

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);

    expect(await screen.findByText('Agente Bodega')).toBeInTheDocument();
    expect(screen.getByText('Gestión de Agentes')).toBeInTheDocument();
    expect(screen.getByText('Mi Empresa')).toBeInTheDocument();
  });

  it('INT-S09: logout limpia localStorage y asigna window.location.href = /login', async () => {
    delete window.location;
    window.location = { href: '' };
    localStorage.setItem('token', 'jwt-test');
    mockAgentsApi([]);

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    await screen.findByText('Sin agentes activos');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/login');
  });
});
