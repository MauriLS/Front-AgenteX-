import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SessionDetail } from '../../../../components/history/SessionDetail';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
}));
vi.mock('react-markdown', () => ({
  default: ({ children, components = {} }) => {
    Object.values(components).forEach(fn => { try { fn({ node: {}, children: null }); } catch (_) {} });
    return <span>{children}</span>;
  },
}));
vi.mock('remark-gfm', () => ({ default: () => null }));

const makeMsg = (id, senderType, content, tokens = 0) => ({
  id,
  sender_type: senderType,
  content,
  created_at: new Date().toISOString(),
  prompt_tokens: tokens,
  completion_tokens: tokens > 0 ? tokens : 0,
});

describe('SessionDetail', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt');
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('muestra "Cargando mensajes..." mientras fetch está pendiente', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<SessionDetail sessionId="42" onBack={vi.fn()} onMenuClick={vi.fn()} />);
    expect(screen.getByText('Cargando mensajes...')).toBeInTheDocument();
  });

  it('sin mensajes muestra texto de vacío', async () => {
    fetch.mockResolvedValue({ json: async () => ({ success: true, messages: [] }) });
    render(<SessionDetail sessionId="42" onBack={vi.fn()} onMenuClick={vi.fn()} />);
    expect(await screen.findByText('Sin mensajes en esta sesión.')).toBeInTheDocument();
  });

  it('renderiza mensajes de usuario e IA', async () => {
    fetch.mockResolvedValue({
      json: async () => ({
        success: true,
        messages: [
          makeMsg(1, 'USER', '¿Cuánto stock hay?'),
          makeMsg(2, 'IA', 'Hay 50 unidades.', 10),
        ],
      }),
    });
    render(<SessionDetail sessionId="42" onBack={vi.fn()} onMenuClick={vi.fn()} />);
    expect(await screen.findByText('¿Cuánto stock hay?')).toBeInTheDocument();
    expect(screen.getByText('Hay 50 unidades.')).toBeInTheDocument();
  });

  it('mensaje IA con prompt_tokens > 0 muestra el conteo de tokens', async () => {
    fetch.mockResolvedValue({
      json: async () => ({
        success: true,
        messages: [makeMsg(1, 'IA', 'respuesta', 15)],
      }),
    });
    render(<SessionDetail sessionId="42" onBack={vi.fn()} onMenuClick={vi.fn()} />);
    expect(await screen.findByText(/30 tokens/)).toBeInTheDocument(); // 15 + 15
  });

  it('mensaje IA con prompt_tokens = 0 no muestra el conteo de tokens', async () => {
    fetch.mockResolvedValue({
      json: async () => ({
        success: true,
        messages: [makeMsg(1, 'IA', 'respuesta sin tokens', 0)],
      }),
    });
    render(<SessionDetail sessionId="42" onBack={vi.fn()} onMenuClick={vi.fn()} />);
    await screen.findByText('respuesta sin tokens');
    expect(screen.queryByText(/\d+ tokens/)).not.toBeInTheDocument();
  });

  it('muestra el sessionId en el header', async () => {
    fetch.mockResolvedValue({ json: async () => ({ success: true, messages: [] }) });
    render(<SessionDetail sessionId="99" onBack={vi.fn()} onMenuClick={vi.fn()} />);
    expect(await screen.findByText('Sesión #99')).toBeInTheDocument();
  });

  it('botón Historial llama onBack', async () => {
    const onBack = vi.fn();
    fetch.mockResolvedValue({ json: async () => ({ success: true, messages: [] }) });
    render(<SessionDetail sessionId="42" onBack={onBack} onMenuClick={vi.fn()} />);
    await screen.findByText('Sin mensajes en esta sesión.');
    fireEvent.click(screen.getByRole('button', { name: /historial/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
