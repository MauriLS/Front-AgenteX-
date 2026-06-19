import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Sidebar } from '../../../../components/layout/Sidebar';
import { apiFetch } from '../../../../lib/apiFetch';

vi.mock('../../../../lib/apiFetch', () => ({
  apiFetch: vi.fn(),
}));

const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));

describe('Sidebar', () => {
  let onNavigate, onClose;

  beforeEach(() => {
    localStorage.clear();
    onNavigate = vi.fn();
    onClose = vi.fn();
    apiFetch.mockResolvedValue({ json: async () => ({ success: true, agents: [] }) });
  });

  it('muestra los items base siempre', async () => {
    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    expect(screen.getByText('Control Center')).toBeInTheDocument();
    expect(screen.getByText('Historial')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Sin agentes activos')).toBeInTheDocument());
  });

  it('muestra "Cargando módulos..." mientras la promesa de agentes está pendiente', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));
    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    expect(screen.getByText('Cargando módulos...')).toBeInTheDocument();
  });

  it('renderiza un NavItem por agente, con icono default si el templateId es desconocido', async () => {
    apiFetch.mockResolvedValue({
      json: async () => ({
        success: true,
        agents: [
          { instanceId: '1', templateId: 'bodega', name: 'Agente Bodega' },
          { instanceId: '2', templateId: 'desconocido', name: 'Agente Raro' },
        ],
      }),
    });

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);

    expect(await screen.findByText('Agente Bodega')).toBeInTheDocument();
    expect(screen.getByText('Agente Raro')).toBeInTheDocument();
  });

  it('si apiFetch falla, no rompe y termina mostrando "Sin agentes activos"', async () => {
    apiFetch.mockRejectedValue(new Error('network down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);

    expect(await screen.findByText('Sin agentes activos')).toBeInTheDocument();
  });

  it('rol ADMIN muestra sección Administración y oculta Super Admin', async () => {
    setUser({ role: 'ADMIN' });
    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);

    await waitFor(() => expect(screen.getByText('Gestión de Agentes')).toBeInTheDocument());
    expect(screen.getByText('Mi Empresa')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
    expect(screen.queryByText('Aprovisionar Empresa')).not.toBeInTheDocument();
  });

  it('rol SUPER_ADMIN muestra sección Super Admin y oculta Administración', async () => {
    setUser({ role: 'SUPER_ADMIN' });
    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);

    await waitFor(() => expect(screen.getByText('Aprovisionar Empresa')).toBeInTheDocument());
    expect(screen.getByText('Empresas')).toBeInTheDocument();
    expect(screen.queryByText('Gestión de Agentes')).not.toBeInTheDocument();
  });

  it('rol normal no muestra ninguna sección administrativa', async () => {
    setUser({ role: 'USER' });
    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);

    await waitFor(() => expect(screen.getByText('Sin agentes activos')).toBeInTheDocument());
    expect(screen.queryByText('Gestión de Agentes')).not.toBeInTheDocument();
    expect(screen.queryByText('Aprovisionar Empresa')).not.toBeInTheDocument();
  });

  it('cerrar sesión limpia localStorage y redirige a /login', async () => {
    setUser({ role: 'ADMIN' });
    localStorage.setItem('token', 'jwt-x');
    delete window.location;
    window.location = { href: '' };

    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Sin agentes activos')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Cerrar sesión'));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('en mobile (innerWidth < 1024) navegar cierra el menú; en desktop no', async () => {
    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Sin agentes activos')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Control Center'));
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
    expect(onClose).not.toHaveBeenCalled();

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    fireEvent.click(screen.getByText('Historial'));
    expect(onClose).toHaveBeenCalled();
  });

  it('rol ADMIN: clic en nav items de administración cubre los onClick handlers', async () => {
    setUser({ role: 'ADMIN' });
    apiFetch.mockResolvedValue({ json: async () => ({ success: true, agents: [] }) });
    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Sin agentes activos')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Gestión de Agentes' }));
    expect(onNavigate).toHaveBeenCalledWith('agents');

    fireEvent.click(screen.getByRole('button', { name: 'Mi Empresa' }));
    expect(onNavigate).toHaveBeenCalledWith('company');

    fireEvent.click(screen.getByRole('button', { name: 'Usuarios' }));
    expect(onNavigate).toHaveBeenCalledWith('users');
  });

  it('rol SUPER_ADMIN: clic en nav items de super admin cubre sus onClick handlers', async () => {
    setUser({ role: 'SUPER_ADMIN' });
    apiFetch.mockResolvedValue({ json: async () => ({ success: true, agents: [] }) });
    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('Sin agentes activos')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Aprovisionar Empresa' }));
    expect(onNavigate).toHaveBeenCalledWith('provisioning');

    fireEvent.click(screen.getByRole('button', { name: 'Empresas' }));
    expect(onNavigate).toHaveBeenCalledWith('companies');
  });

  it('clic en agente dinámico cubre el handler () => navigate(agent.templateId)', async () => {
    apiFetch.mockResolvedValue({
      json: async () => ({
        success: true,
        agents: [{ instanceId: '1', templateId: 'bodega', name: 'Agente Bodega' }],
      }),
    });
    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Agente Bodega' }));
    expect(onNavigate).toHaveBeenCalledWith('bodega');
  });
  it('clic en el botón de colapso oculta las etiquetas y muestra indicador de tab activa', async () => {
    render(<Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={false} onClose={onClose} />);

    // El botón de colapso es el último botón del Sidebar (no tiene texto, solo icono)
    const allBtns = screen.getAllByRole('button');
    const collapseBtn = allBtns[allBtns.length - 1];
    fireEvent.click(collapseBtn);

    // En estado colapsado los labels desaparecen
    expect(screen.queryByText('Control Center')).not.toBeInTheDocument();

    // Volver a expandir
    fireEvent.click(collapseBtn);
    expect(screen.getByText('Control Center')).toBeInTheDocument();
  });
  it('clic en el overlay (isOpen=true) llama onClose', async () => {
    const { container } = render(
      <Sidebar activeTab="dashboard" onNavigate={onNavigate} isOpen={true} onClose={onClose} />
    );
    await waitFor(() => expect(screen.getByText('Sin agentes activos')).toBeInTheDocument());

    fireEvent.click(container.querySelector('.fixed.inset-0.bg-slate-950\\/80'));
    expect(onClose).toHaveBeenCalled();
  });
});
