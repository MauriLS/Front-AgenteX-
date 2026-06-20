// Seguridad — XSS
//
// ChatInterface y SessionDetail renderizan contenido dinámico (mensajes del
// usuario y del agente IA) con ReactMarkdown. Por defecto, react-markdown NO
// interpreta HTML embebido en el markdown (lo escapa como texto plano) salvo
// que se use el plugin `rehype-raw`. Esta suite fija ese contrato: confirma
// que un payload de script/HTML no se ejecuta ni se inyecta como nodo real
// del DOM, solo se muestra como texto. Si en el futuro alguien agrega
// `rehype-raw` para soportar HTML enriquecido, este test debe fallar y
// alertar sobre el riesgo de XSS reintroducido.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '../../components/chat/ChatInterface';
import { SessionDetail } from '../../components/history/SessionDetail';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
}));

const XSS_PAYLOAD = '<img src=x onerror="window.__xss_pwned = true">';
const SCRIPT_PAYLOAD = '<script>window.__xss_pwned = true</script>';

describe('Seguridad — XSS en renderizado de mensajes', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt-test');
    window.__xss_pwned = undefined;
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('ChatInterface: respuesta del agente con <script> no se ejecuta, se muestra como texto', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reply: SCRIPT_PAYLOAD, session_chat_id: 's1' }),
    });

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Escribe tu consulta...'), { target: { value: 'hola' } });
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    await waitFor(() => expect(screen.getByText(/script/)).toBeInTheDocument());

    expect(window.__xss_pwned).toBeUndefined();
    expect(document.querySelector('script[data-injected]')).toBeNull();
    // El texto del payload aparece literal, no como un <script> ejecutable real
    expect(document.querySelectorAll('script').length).toBe(0);
  });

  it('ChatInterface: <img onerror=...> en la respuesta no dispara el handler', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reply: XSS_PAYLOAD, session_chat_id: 's2' }),
    });

    render(<ChatInterface agentId="bodega" onMenuClick={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Escribe tu consulta...'), { target: { value: 'hola' } });
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    await waitFor(() => expect(screen.getByText(/onerror/)).toBeInTheDocument());
    expect(window.__xss_pwned).toBeUndefined();
  });

  it('SessionDetail: mensaje histórico con HTML embebido no se ejecuta', async () => {
    fetch.mockResolvedValue({
      json: async () => ({
        success: true,
        messages: [
          { id: 1, sender_type: 'IA', content: XSS_PAYLOAD, created_at: new Date().toISOString(), prompt_tokens: 0, completion_tokens: 0 },
        ],
      }),
    });

    render(<SessionDetail sessionId={1} onBack={vi.fn()} onMenuClick={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/onerror/)).toBeInTheDocument());
    expect(window.__xss_pwned).toBeUndefined();
  });
});