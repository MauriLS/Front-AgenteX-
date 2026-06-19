import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../../../../components/chat/ChatInterface';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
}));
vi.mock('react-markdown', () => ({
  default: ({ children, components = {} }) => {
    // Invocar cada override para que v8 registre sus cuerpos como executed
    Object.values(components).forEach(fn => { try { fn({ node: {}, children: null }); } catch (_) {} });
    return <span>{children}</span>;
  },
}));
vi.mock('remark-gfm', () => ({ default: () => null }));

describe('ChatInterface', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt');
    global.fetch = vi.fn();
    delete window.location;
    window.location = { href: '' };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renderiza el mensaje de bienvenida inicial', () => {
    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    expect(screen.getByText(/Enlace Activo/)).toBeInTheDocument();
  });

  it('muestra el agentId en el header', () => {
    render(<ChatInterface agentId="ventas" onMenuClick={vi.fn()} />);
    expect(screen.getByText(/OPS-VENTAS-COMMAND/)).toBeInTheDocument();
  });

  it('cambiar agentId reinicia el chat al mensaje de bienvenida', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reply: 'respuesta agente', session_chat_id: null }),
    });

    const { rerender } = render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    const input = screen.getByPlaceholderText('Escribe tu consulta...');
    await userEvent.type(input, 'Hola');
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));
    await screen.findByText('respuesta agente');

    rerender(<ChatInterface agentId="ventas" onMenuClick={vi.fn()} />);
    expect(screen.queryByText('respuesta agente')).not.toBeInTheDocument();
    expect(screen.getByText(/Enlace Activo/)).toBeInTheDocument();
  });

  it('input vacío no llama fetch', () => {
    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    const form = screen.getByPlaceholderText('Escribe tu consulta...').closest('form');
    fireEvent.submit(form);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('send exitoso: agrega mensaje usuario, reply y muestra SESSION_ID', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reply: 'Stock disponible: 50', session_chat_id: 'sess-xyz' }),
    });

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    const input = screen.getByPlaceholderText('Escribe tu consulta...');
    await userEvent.type(input, '¿Hay stock?');
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    expect(await screen.findByText('¿Hay stock?')).toBeInTheDocument();
    expect(await screen.findByText('Stock disponible: 50')).toBeInTheDocument();
    expect(screen.getByText(/sess-xyz/)).toBeInTheDocument();
  });

  it('send con sessionId ya seteado no lo sobrescribe (rama !sessionId=false)', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reply: 'ok', session_chat_id: 'sess-1' }),
    });

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    const input = screen.getByPlaceholderText('Escribe tu consulta...');

    // primer mensaje → setSessionId('sess-1')
    await userEvent.type(input, 'mensaje 1');
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));
    await screen.findAllByText('ok');

    // segundo mensaje → session_chat_id llega pero !sessionId es false → no cambia
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reply: 'ok2', session_chat_id: 'sess-2' }),
    });
    await userEvent.type(input, 'mensaje 2');
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));
    await screen.findByText('ok2');
    expect(screen.queryByText(/sess-2/)).not.toBeInTheDocument();
    expect(screen.getByText(/sess-1/)).toBeInTheDocument();
  });

  it('respuesta 401: limpia localStorage y redirige a /login', async () => {
    fetch.mockResolvedValue({ status: 401, ok: false });

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    const input = screen.getByPlaceholderText('Escribe tu consulta...');
    await userEvent.type(input, 'test');
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    await waitFor(() => expect(window.location.href).toBe('/login'));
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('respuesta HTTP no-OK agrega mensaje de CRITICAL ERROR', async () => {
    fetch.mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({ error: 'Server crashed' }),
    });

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    const input = screen.getByPlaceholderText('Escribe tu consulta...');
    await userEvent.type(input, 'test');
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    expect(await screen.findByText(/CRITICAL ERROR/)).toBeInTheDocument();
  });

  it('fallo de red agrega mensaje de CRITICAL ERROR', async () => {
    fetch.mockRejectedValue(new Error('net::ERR_FAILED'));

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    const input = screen.getByPlaceholderText('Escribe tu consulta...');
    await userEvent.type(input, 'test');
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    expect(await screen.findByText(/CRITICAL ERROR/)).toBeInTheDocument();
  });
});
