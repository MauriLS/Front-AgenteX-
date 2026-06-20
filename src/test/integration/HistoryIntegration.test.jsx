import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { SessionHistory } from '../../components/history/SessionHistory';
import { SessionDetail } from '../../components/history/SessionDetail';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));
vi.mock('react-markdown', () => ({
  default: ({ children, components = {} }) => {
    Object.values(components).forEach(fn => { try { fn({ node: {}, children: null }); } catch (_) {} });
    return <span>{children}</span>;
  },
}));
vi.mock('remark-gfm', () => ({ default: () => null }));

// Wrapper que replica el estado padre (CoreSystem.selectedSession)
// entre SessionHistory y SessionDetail sin necesitar App completo.
const HistoryFlow = ({ onMenuClick = vi.fn() }) => {
  const [selectedSession, setSelectedSession] = React.useState(null);
  return selectedSession
    ? <SessionDetail
        sessionId={selectedSession}
        onBack={() => setSelectedSession(null)}
        onMenuClick={onMenuClick}
      />
    : <SessionHistory
        onMenuClick={onMenuClick}
        onSelectSession={id => setSelectedSession(id)}
      />;
};

const makeSession = (id, templateId = 'bodega', createdAt = new Date().toISOString()) => ({
  id,
  created_at: createdAt,
  company_agents: { agent_template_id: templateId },
});

const makeMessage = (id, senderType, content) => ({
  id,
  sender_type: senderType,
  content,
  created_at: new Date().toISOString(),
  prompt_tokens:    senderType === 'IA' ? 10 : 0,
  completion_tokens: senderType === 'IA' ? 5  : 0,
});

describe('Integración — SessionHistory + SessionDetail', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt-test');
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('INT-H01: lista de sesiones carga desde la API y se muestra', async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({
        success: true,
        sessions: [makeSession(1, 'bodega'), makeSession(2, 'ventas')],
      }),
    });

    render(<HistoryFlow />);

    expect(await screen.findByText(/bodega · sesión #1/)).toBeInTheDocument();
    expect(screen.getByText(/ventas · sesión #2/)).toBeInTheDocument();
  });

  it('INT-H02: seleccionar sesión carga SessionDetail con los mensajes correctos', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          sessions: [makeSession(42, 'bodega')],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          messages: [
            makeMessage(1, 'USER', '¿Cuánto stock?'),
            makeMessage(2, 'IA',   'Hay 50 unidades.'),
          ],
        }),
      });

    render(<HistoryFlow />);
    await screen.findByText(/bodega · sesión #42/);

    fireEvent.click(screen.getByText(/bodega · sesión #42/));

    expect(await screen.findByText('¿Cuánto stock?')).toBeInTheDocument();
    expect(screen.getByText('Hay 50 unidades.')).toBeInTheDocument();
  });

  it('INT-H03: SessionDetail hace fetch a la URL correcta con el sessionId seleccionado', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: async () => ({ success: true, sessions: [makeSession(99, 'ventas')] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, messages: [] }),
      });

    render(<HistoryFlow />);
    await screen.findByText(/ventas · sesión #99/);
    fireEvent.click(screen.getByText(/ventas · sesión #99/));
    await screen.findByText('Sin mensajes en esta sesión.');

    const [detailUrl] = fetch.mock.calls[1];
    expect(detailUrl).toContain('/api/sessions/99/messages');
  });

  it('INT-H04: botón "Historial" en SessionDetail vuelve a SessionHistory', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: async () => ({ success: true, sessions: [makeSession(1, 'bodega')] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, messages: [] }),
      })
      // SessionHistory re-monta al volver → lanza un nuevo fetch de la lista
      .mockResolvedValueOnce({
        json: async () => ({ success: true, sessions: [makeSession(1, 'bodega')] }),
      });

    render(<HistoryFlow />);
    await screen.findByText(/bodega · sesión #1/);

    fireEvent.click(screen.getByText(/bodega · sesión #1/));
    await screen.findByText('Sin mensajes en esta sesión.');

    fireEvent.click(screen.getByRole('button', { name: /historial/i }));

    // findByText (async) espera a que la lista recargue tras el re-mount
    expect(await screen.findByText(/bodega · sesión #1/)).toBeInTheDocument();
  });

  it('INT-H05: volver y re-seleccionar hace un nuevo fetch de mensajes', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: async () => ({ success: true, sessions: [makeSession(1, 'bodega')] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, messages: [makeMessage(1, 'USER', 'msg A')] }),
      })
      // SessionHistory re-monta al volver → 3er fetch de la lista
      .mockResolvedValueOnce({
        json: async () => ({ success: true, sessions: [makeSession(1, 'bodega')] }),
      })
      // 4a llamada: detalle en la segunda selección
      .mockResolvedValueOnce({
        json: async () => ({ success: true, messages: [makeMessage(1, 'USER', 'msg A')] }),
      });

    render(<HistoryFlow />);
    await screen.findByText(/bodega · sesión #1/);

    fireEvent.click(screen.getByText(/bodega · sesión #1/));
    await screen.findByText('msg A');

    fireEvent.click(screen.getByRole('button', { name: /historial/i }));
    await screen.findByText(/bodega · sesión #1/);

    fireEvent.click(screen.getByText(/bodega · sesión #1/));
    await screen.findByText('msg A');

    // 4 llamadas: lista-inicial + detalle1 + re-lista(remount) + detalle2
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('INT-H06: eliminar sesión actualiza la lista sin recargar la API', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          sessions: [makeSession(1, 'bodega'), makeSession(2, 'ventas')],
        }),
      })
      .mockResolvedValueOnce({ ok: true }); // DELETE /api/sessions/1

    render(<HistoryFlow />);
    await screen.findByText(/bodega · sesión #1/);

    const deleteBtns = screen.getAllByRole('button', { name: /eliminar sesión/i });
    fireEvent.click(deleteBtns[0]);

    await waitFor(() =>
      expect(screen.queryByText(/bodega · sesión #1/)).not.toBeInTheDocument()
    );
    expect(screen.getByText(/ventas · sesión #2/)).toBeInTheDocument();
  });

  it('INT-H07: el token se incluye en Authorization para la carga de mensajes', async () => {
    localStorage.setItem('token', 'tok-xyz');

    global.fetch
      .mockResolvedValueOnce({
        json: async () => ({ success: true, sessions: [makeSession(5, 'bodega')] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, messages: [] }),
      });

    render(<HistoryFlow />);
    await screen.findByText(/bodega · sesión #5/);
    fireEvent.click(screen.getByText(/bodega · sesión #5/));
    await screen.findByText('Sin mensajes en esta sesión.');

    const [, config] = fetch.mock.calls[1];
    expect(config.headers.Authorization).toBe('Bearer tok-xyz');
  });

  it('INT-H08: lista vacía muestra el mensaje de estado vacío', async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({ success: true, sessions: [] }),
    });

    render(<HistoryFlow />);
    expect(await screen.findByText('Sin conversaciones registradas aún.')).toBeInTheDocument();
  });

  it('INT-H09: sessionId en header de SessionDetail coincide con el número de la sesión', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: async () => ({ success: true, sessions: [makeSession(77, 'analitica')] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, messages: [] }),
      });

    render(<HistoryFlow />);
    await screen.findByText(/analitica · sesión #77/);
    fireEvent.click(screen.getByText(/analitica · sesión #77/));
    await screen.findByText('Sin mensajes en esta sesión.');

    expect(screen.getByText('Sesión #77')).toBeInTheDocument();
  });
});
