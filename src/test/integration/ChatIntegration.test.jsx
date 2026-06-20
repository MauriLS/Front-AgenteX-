import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../../components/chat/ChatInterface';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
}));
vi.mock('react-markdown', () => ({
  default: ({ children, components = {} }) => {
    Object.values(components).forEach(fn => { try { fn({ node: {}, children: null }); } catch (_) {} });
    return <span>{children}</span>;
  },
}));
vi.mock('remark-gfm', () => ({ default: () => null }));

// fetch NO se mockea a nivel de módulo apiFetch — se usa global.fetch directo
// porque ChatInterface llama a fetch() nativo internamente.

describe('Integración — ChatInterface + fetch', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt-test');
    global.fetch = vi.fn();
    delete window.location;
    window.location = { href: '' };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const sendMessage = async (text) => {
    const input = screen.getByPlaceholderText('Escribe tu consulta...');
    await userEvent.type(input, text);
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));
  };

  const okReply = (reply, session_chat_id = null) => ({
    ok: true, status: 200,
    json: async () => ({ reply, session_chat_id }),
  });

  it('INT-C01: el payload incluye message, agent_id, history y session_chat_id', async () => {
    global.fetch.mockResolvedValue(okReply('respuesta'));

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    await sendMessage('consulta inicial');
    await screen.findByText('respuesta');

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.message).toBe('consulta inicial');
    expect(body.agent_id).toBe('bodega');
    expect(Array.isArray(body.history)).toBe(true);
    expect(body).toHaveProperty('session_chat_id');
  });

  it('INT-C02: primer mensaje envía session_chat_id null', async () => {
    global.fetch.mockResolvedValue(okReply('ok', 'sess-1'));

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    await sendMessage('hola');
    await screen.findByText('ok');

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.session_chat_id).toBeNull();
  });

  it('INT-C03: session_chat_id de la primera respuesta se incluye en el segundo mensaje', async () => {
    global.fetch
      .mockResolvedValueOnce(okReply('r1', 'sess-xyz'))
      .mockResolvedValueOnce(okReply('r2', 'sess-xyz'));

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);

    await sendMessage('mensaje 1');
    await screen.findByText('r1');

    await sendMessage('mensaje 2');
    await screen.findByText('r2');

    const secondBody = JSON.parse(fetch.mock.calls[1][1].body);
    expect(secondBody.session_chat_id).toBe('sess-xyz');
  });

  it('INT-C04: sessionId no se sobreescribe en mensajes posteriores (rama !sessionId=false)', async () => {
    global.fetch
      .mockResolvedValueOnce(okReply('r1', 'sess-original'))
      .mockResolvedValueOnce(okReply('r2', 'sess-nuevo'));

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);

    await sendMessage('msg1');
    await screen.findByText('r1');
    expect(screen.getByText(/sess-original/)).toBeInTheDocument();

    await sendMessage('msg2');
    await screen.findByText('r2');

    // El sessionId NO debe haberse reemplazado con 'sess-nuevo'
    expect(screen.getByText(/sess-original/)).toBeInTheDocument();
    expect(screen.queryByText(/sess-nuevo/)).not.toBeInTheDocument();
  });

  it('INT-C05: el header Authorization incluye el token de localStorage', async () => {
    localStorage.setItem('token', 'mi-token-secreto');
    global.fetch.mockResolvedValue(okReply('ok'));

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    await sendMessage('test');
    await screen.findByText('ok');

    const [, config] = fetch.mock.calls[0];
    expect(config.headers.Authorization).toBe('Bearer mi-token-secreto');
  });

  it('INT-C06: respuesta 401 limpia localStorage y redirige a /login', async () => {
    global.fetch.mockResolvedValue({ status: 401, ok: false });

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    await sendMessage('test');

    await waitFor(() => expect(window.location.href).toBe('/login'));
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('INT-C07: error HTTP no-401 agrega mensaje de error sin redirigir', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    });

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    await sendMessage('test');

    expect(await screen.findByText(/CRITICAL ERROR/)).toBeInTheDocument();
    expect(window.location.href).toBe('');
  });

  it('INT-C08: cambiar agentId resetea chat y envía session_chat_id null en el siguiente mensaje', async () => {
    global.fetch
      .mockResolvedValueOnce(okReply('ok1', 'sess-abc'))
      .mockResolvedValueOnce(okReply('ok2', 'sess-nuevo'));

    const { rerender } = render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);
    await sendMessage('msg1');
    await screen.findByText('ok1');

    rerender(<ChatInterface agentId="ventas" onMenuClick={vi.fn()} />);
    expect(screen.queryByText('ok1')).not.toBeInTheDocument();

    await sendMessage('msg2');
    await screen.findByText('ok2');

    const lastBody = JSON.parse(fetch.mock.calls[fetch.mock.calls.length - 1][1].body);
    expect(lastBody.session_chat_id).toBeNull();
    expect(lastBody.agent_id).toBe('ventas');
  });

  it('INT-C09: historial de conversación NO incluye el mensaje de bienvenida en el payload', async () => {
    global.fetch
      .mockResolvedValueOnce(okReply('r1', 'sess-1'))
      .mockResolvedValueOnce(okReply('r2', 'sess-1'));

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);

    await sendMessage('primera pregunta');
    await screen.findByText('r1');

    await sendMessage('segunda pregunta');
    await screen.findByText('r2');

    // La historia en el segundo mensaje debe contener solo los intercambios reales
    const secondBody = JSON.parse(fetch.mock.calls[1][1].body);
    // El mensaje de bienvenida tiene metadata.erpStatus='synced' → se filtra
    const welcomeInHistory = secondBody.history.some(
      m => m.content.includes('Enlace Activo')
    );
    expect(welcomeInHistory).toBe(false);
  });
});
