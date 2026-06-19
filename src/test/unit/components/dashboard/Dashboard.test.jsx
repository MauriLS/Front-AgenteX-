import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Dashboard } from '../../../../components/dashboard/Dashboard';
import { apiFetch } from '../../../../lib/apiFetch';

vi.mock('../../../../lib/apiFetch', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
}));

const mockEndpoints = ({ stats, agents, user }) => {
  apiFetch.mockImplementation((path) => {
    if (path === '/api/sessions/stats') return Promise.resolve({ json: async () => ({ success: true, stats }) });
    if (path === '/api/agents/my-agents') return Promise.resolve({ json: async () => ({ success: true, agents }) });
    if (path === '/api/users/me') return Promise.resolve({ json: async () => ({ success: true, user }) });
    return Promise.reject(new Error(`endpoint no mockeado: ${path}`));
  });
};

describe('Dashboard', () => {
  let onNavigate, onMenuClick;

  beforeEach(() => {
    onNavigate = vi.fn();
    onMenuClick = vi.fn();
  });

  it('agrega stats de múltiples agentes, formatea tokens >=1000 con "k" y muestra el username', async () => {
    mockEndpoints({
      stats: [
        { agent_id: 'ventas', agent_name: 'Ventas Bot', total_sesiones: 3, total_preguntas: 10, total_tokens: 2500 },
        { agent_id: 'desconocido', agent_name: 'Agente Raro', total_sesiones: 1, total_preguntas: 2, total_tokens: 100 },
      ],
      agents: [{ instanceId: '1' }, { instanceId: '2' }],
      user: { username: 'rayker', role: 'USER' },
    });

    render(<Dashboard onMenuClick={onMenuClick} onNavigate={onNavigate} />);

    expect(await screen.findByText('Bienvenido, rayker')).toBeInTheDocument();
    expect(screen.getByText('Ventas Bot')).toBeInTheDocument();
    expect(screen.getByText('Agente Raro')).toBeInTheDocument();
    expect(screen.getByText('2.6k')).toBeInTheDocument(); // total tokens 2500+100=2600 -> "2.6k"
  });

  it('rol ADMIN antepone "Administrador ·" a la fecha', async () => {
    mockEndpoints({ stats: [], agents: [], user: { username: 'jefa', role: 'ADMIN' } });

    render(<Dashboard onMenuClick={onMenuClick} onNavigate={onNavigate} />);

    expect(await screen.findByText(/Administrador ·/)).toBeInTheDocument();
  });

  it('sin sesiones registradas muestra el mensaje de actividad vacía', async () => {
    mockEndpoints({ stats: [], agents: [], user: { username: 'rayker', role: 'USER' } });

    render(<Dashboard onMenuClick={onMenuClick} onNavigate={onNavigate} />);

    expect(await screen.findByText(/Sin actividad registrada/)).toBeInTheDocument();
  });

  it('si falla la carga (success:false o reject), cae a "Command Overview" sin crashear', async () => {
    apiFetch.mockRejectedValue(new Error('caída de red'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<Dashboard onMenuClick={onMenuClick} onNavigate={onNavigate} />);

    expect(await screen.findByText('Command Overview')).toBeInTheDocument();
  });

  it('click en una AgentCard llama onNavigate con el agent_id', async () => {
    mockEndpoints({
      stats: [{ agent_id: 'ventas', agent_name: 'Ventas Bot', total_sesiones: 1, total_preguntas: 1, total_tokens: 10 }],
      agents: [{ instanceId: '1' }],
      user: { username: 'rayker', role: 'USER' },
    });

    render(<Dashboard onMenuClick={onMenuClick} onNavigate={onNavigate} />);

    fireEvent.click(await screen.findByText('Ventas Bot'));
    expect(onNavigate).toHaveBeenCalledWith('ventas');
  });

  it('el botón de menú mobile llama onMenuClick', async () => {
    mockEndpoints({ stats: [], agents: [], user: { username: 'rayker', role: 'USER' } });

    render(<Dashboard onMenuClick={onMenuClick} onNavigate={onNavigate} />);
    await waitFor(() => expect(screen.getByText('Command Overview')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button'));
    expect(onMenuClick).toHaveBeenCalled();
  });
});
