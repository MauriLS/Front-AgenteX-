import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SessionHistory } from '../../../../components/history/SessionHistory';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const makeSession = (id, templateId, createdAt) => ({
  id,
  created_at: createdAt || new Date().toISOString(),
  company_agents: { agent_template_id: templateId },
});

describe('SessionHistory', () => {
  let onSelectSession;

  beforeEach(() => {
    localStorage.setItem('token', 'jwt');
    global.fetch = vi.fn();
    onSelectSession = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('muestra "Cargando sesiones..." mientras fetch está pendiente', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<SessionHistory onMenuClick={vi.fn()} onSelectSession={onSelectSession} />);
    expect(screen.getByText('Cargando sesiones...')).toBeInTheDocument();
  });

  it('lista vacía muestra mensaje correspondiente', async () => {
    fetch.mockResolvedValue({ json: async () => ({ success: true, sessions: [] }) });
    render(<SessionHistory onMenuClick={vi.fn()} onSelectSession={onSelectSession} />);
    expect(await screen.findByText('Sin conversaciones registradas aún.')).toBeInTheDocument();
  });

  it('renderiza sesiones con distintos templateIds (iconMap/colorMap coverage)', async () => {
    fetch.mockResolvedValue({
      json: async () => ({
        success: true,
        sessions: [
          makeSession(1, 'bodega'),
          makeSession(2, 'ventas'),
          makeSession(3, 'analitica'),
          makeSession(4, 'logistica'),
          makeSession(5, 'desconocido'),
        ],
      }),
    });
    render(<SessionHistory onMenuClick={vi.fn()} onSelectSession={onSelectSession} />);
    expect(await screen.findByText(/bodega · sesión #1/)).toBeInTheDocument();
    expect(screen.getByText(/ventas · sesión #2/)).toBeInTheDocument();
    expect(screen.getByText(/desconocido · sesión #5/)).toBeInTheDocument();
  });

  it('formatDate: hoy muestra "Hoy", ayer muestra "Ayer", fecha antigua la formatea', async () => {
    const hoy = new Date().toISOString();
    const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
    const viejo = new Date('2024-01-05').toISOString();

    fetch.mockResolvedValue({
      json: async () => ({
        success: true,
        sessions: [
          makeSession(1, 'bodega', hoy),
          makeSession(2, 'ventas', ayer.toISOString()),
          makeSession(3, 'analitica', viejo),
        ],
      }),
    });
    render(<SessionHistory onMenuClick={vi.fn()} onSelectSession={onSelectSession} />);
    await waitFor(() => expect(screen.getByText(/^Hoy/)).toBeInTheDocument());
    expect(screen.getByText(/^Ayer/)).toBeInTheDocument();
    // fecha vieja usa toLocaleDateString
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('click en sesión llama onSelectSession con su id', async () => {
    fetch.mockResolvedValue({
      json: async () => ({ success: true, sessions: [makeSession(42, 'bodega')] }),
    });
    render(<SessionHistory onMenuClick={vi.fn()} onSelectSession={onSelectSession} />);
    fireEvent.click(await screen.findByText(/bodega · sesión #42/));
    expect(onSelectSession).toHaveBeenCalledWith(42);
  });

  it('eliminar sesión exitosa la quita de la lista', async () => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') return Promise.resolve({ ok: true });
      return Promise.resolve({
        json: async () => ({
          success: true,
          sessions: [makeSession(1, 'bodega'), makeSession(2, 'ventas')],
        }),
      });
    });
    render(<SessionHistory onMenuClick={vi.fn()} onSelectSession={onSelectSession} />);
    await screen.findByText(/bodega · sesión #1/);

    fireEvent.click(screen.getAllByRole('button', { name: /eliminar sesión/i })[0]);

    await waitFor(() =>
      expect(screen.queryByText(/bodega · sesión #1/)).not.toBeInTheDocument()
    );
    expect(screen.getByText(/ventas · sesión #2/)).toBeInTheDocument();
  });

  it('eliminar sesión con res.ok=false mantiene la lista', async () => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') return Promise.resolve({ ok: false });
      return Promise.resolve({
        json: async () => ({ success: true, sessions: [makeSession(1, 'bodega')] }),
      });
    });
    render(<SessionHistory onMenuClick={vi.fn()} onSelectSession={onSelectSession} />);
    await screen.findByText(/bodega · sesión #1/);

    fireEvent.click(screen.getByRole('button', { name: /eliminar sesión/i }));
    await waitFor(() =>
      expect(screen.getByText(/bodega · sesión #1/)).toBeInTheDocument()
    );
  });

  it('fallo de red en carga inicial no rompe el componente', async () => {
    fetch.mockRejectedValue(new Error('red caída'));
    render(<SessionHistory onMenuClick={vi.fn()} onSelectSession={onSelectSession} />);
    expect(await screen.findByText('Sin conversaciones registradas aún.')).toBeInTheDocument();
  });
});
