import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentsSettings } from '../../components/settings/AgentsSettings';

// Prueba la integración real entre:
// AgentsSettings (padre) ←→ AgentCard (hijo) ←→ NuevoAgenteModal (hijo)
// sin mockear ninguno — todos interactúan via estado y props reales.

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...p }) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const makeAgent = (id, templateId, instructions = 'Instrucción base') => ({
  id,
  agent_template_id: templateId,
  is_active: true,
  custom_instructions: instructions,
  temperature: 0.3,
  agent_templates: { name: `Agente ${templateId}`, motor: 'gpt-4' },
});

const makeTemplate = (id, name) => ({ id, name, motor: 'gpt-4' });

describe('Integración — AgentsSettings + AgentCard + NuevoAgenteModal', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt-test');
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Configura fetch para los dos endpoints de carga inicial + operaciones CRUD
  const setupFetch = ({ agents = [], templates = [], putSuccess = true } = {}) => {
    global.fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'PUT')
        return Promise.resolve({ json: async () => ({ success: putSuccess }) });
      if (opts?.method === 'DELETE')
        return Promise.resolve({ ok: true });
      if (url.includes('/api/agents/templates'))
        return Promise.resolve({ json: async () => ({ success: true, templates }) });
      if (url.includes('/api/agents'))
        return Promise.resolve({ json: async () => ({ success: true, agents }) });
      return Promise.resolve({ json: async () => ({}) });
    });
  };

  it('INT-A01: carga agentes y templates en paralelo (2 fetch al montar)', async () => {
    setupFetch({
      agents:    [makeAgent(1, 'bodega'), makeAgent(2, 'ventas')],
      templates: [makeTemplate('bodega', 'Bodega'), makeTemplate('ventas', 'Ventas')],
    });

    render(<AgentsSettings onMenuClick={vi.fn()} />);

    expect(await screen.findByText('Agente bodega')).toBeInTheDocument();
    expect(screen.getByText('Agente ventas')).toBeInTheDocument();

    // Exactamente 2 llamadas: /api/agents y /api/agents/templates
    expect(fetch).toHaveBeenCalledTimes(2);
    const urls = fetch.mock.calls.map(([url]) => url);
    expect(urls.some(u => u.includes('/api/agents/templates'))).toBe(true);
    expect(urls.some(u => u.includes('/api/agents') && !u.includes('templates'))).toBe(true);
  });

  it('INT-A02: el token se inyecta en el Authorization de ambas llamadas iniciales', async () => {
    localStorage.setItem('token', 'tok-secreto');
    setupFetch({ agents: [], templates: [] });

    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText(/Sin agentes activos/);

    fetch.mock.calls.forEach(([, config]) => {
      expect(config.headers.Authorization).toBe('Bearer tok-secreto');
    });
  });

  it('INT-A03: AgentCard → editar instrucciones → guardar → PUT con cuerpo correcto', async () => {
    setupFetch({ agents: [makeAgent(7, 'bodega', 'Original')], templates: [] });

    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');

    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));
    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Nueva instrucción actualizada');

    fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() => {
      const putCall = fetch.mock.calls.find(([, o]) => o?.method === 'PUT');
      expect(putCall).toBeTruthy();
      expect(putCall[0]).toContain('/api/agents/7');
      const body = JSON.parse(putCall[1].body);
      expect(body.custom_instructions).toBe('Nueva instrucción actualizada');
      expect(body.temperature).toBe(0.3);
    });
  });

  it('INT-A04: después de guardar el botón queda disabled (dirty=false)', async () => {
    setupFetch({ agents: [makeAgent(1, 'bodega', 'Original')], templates: [] });

    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');

    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));
    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Actualizada');

    fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

    // Tras PUT exitoso el parent actualiza el prop → dirty vuelve a false
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^guardar$/i })).toBeDisabled()
    );
  });

  it('INT-A05: cambiar temperatura activa el botón Guardar en AgentCard', async () => {
    setupFetch({ agents: [makeAgent(1, 'bodega')], templates: [] });

    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');
    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));

    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.8' } });

    expect(screen.getByRole('button', { name: /^guardar$/i })).not.toBeDisabled();
  });

  it('INT-A06: desactivar agente llama DELETE y lo elimina del estado', async () => {
    setupFetch({
      agents:    [makeAgent(3, 'bodega'), makeAgent(4, 'ventas')],
      templates: [],
    });

    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');

    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));
    fireEvent.click(screen.getByRole('button', { name: /desactivar agente/i }));

    await waitFor(() =>
      expect(screen.queryByText('Agente bodega')).not.toBeInTheDocument()
    );
    expect(screen.getByText('Agente ventas')).toBeInTheDocument();
  });

  it('INT-A07: modal filtra templates ya activos de las opciones disponibles', async () => {
    setupFetch({
      agents:    [makeAgent(1, 'bodega')],
      templates: [makeTemplate('bodega', 'Bodega'), makeTemplate('ventas', 'Ventas')],
    });

    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');

    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));

    const options = screen.getAllByRole('option');
    const values = options.map(o => o.value);
    expect(values).not.toContain('bodega'); // ya activo → filtrado
    expect(values).toContain('ventas');     // disponible
  });

  it('INT-A08: crear agente via modal → POST → refetch → agente aparece en lista', async () => {
    const nuevoAgente = makeAgent(99, 'ventas', 'Nueva instrucción');
    let agentCallCount = 0;

    global.fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'POST')
        return Promise.resolve({ ok: true, json: async () => ({ success: true, agent: nuevoAgente }) });
      if (url.includes('/api/agents/templates'))
        return Promise.resolve({ json: async () => ({ success: true, templates: [makeTemplate('ventas', 'Ventas')] }) });
      if (url.includes('/api/agents')) {
        agentCallCount++;
        const agents = agentCallCount > 1 ? [nuevoAgente] : [];
        return Promise.resolve({ json: async () => ({ success: true, agents }) });
      }
    });

    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText(/Sin agentes activos/);

    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ventas' } });
    await userEvent.type(screen.getByRole('textbox'), 'Nueva instrucción');
    fireEvent.click(screen.getByRole('button', { name: /crear agente/i }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /añadir agente/i })).not.toBeInTheDocument()
    );
    expect(await screen.findByText('Agente ventas')).toBeInTheDocument();
  });

  it('INT-A09: todos los templates activos → modal muestra mensaje de sin disponibles', async () => {
    setupFetch({
      agents:    [makeAgent(1, 'ventas')],
      templates: [makeTemplate('ventas', 'Ventas')],
    });

    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente ventas');

    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));
    expect(screen.getByText(/Todos los templates disponibles ya están activos/)).toBeInTheDocument();
  });

  it('INT-A10: múltiples AgentCard renderizan independientemente su estado expandido', async () => {
    setupFetch({
      agents: [makeAgent(1, 'bodega', 'Instrucción 1'), makeAgent(2, 'ventas', 'Instrucción 2')],
      templates: [],
    });

    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');

    // Expandir solo bodega
    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));

    // Solo aparece UN textarea (el de bodega)
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByDisplayValue('Instrucción 1')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Instrucción 2')).not.toBeInTheDocument();
  });
});
