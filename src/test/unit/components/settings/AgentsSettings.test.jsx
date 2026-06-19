import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentsSettings } from '../../../../components/settings/AgentsSettings';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const makeAgent = (id, templateId, instructions = 'Eres el agente', withTemplates = true) => ({
  id,
  agent_template_id: templateId,
  is_active: true,
  custom_instructions: instructions,
  temperature: 0.3,
  ...(withTemplates ? { agent_templates: { name: `Agente ${templateId}`, motor: 'gpt-4' } } : {}),
});

const makeTemplate = (id, name = `Template ${id}`) => ({ id, name, motor: 'gpt-4' });

describe('AgentsSettings', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt');
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const mockLoad = (agents, templates, overrides = {}) => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'PUT')
        return Promise.resolve({ json: async () => ({ success: true, ...overrides }) });
      if (opts?.method === 'DELETE')
        return Promise.resolve({ ok: true });
      if (opts?.method === 'POST')
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, agent: makeAgent(99, 'bodega') }),
        });
      if (url.includes('/api/agents/templates'))
        return Promise.resolve({ json: async () => ({ success: true, templates }) });
      if (url.includes('/api/agents'))
        return Promise.resolve({ json: async () => ({ success: true, agents }) });
      return Promise.reject(new Error(`unmocked: ${url}`));
    });
  };

  // ── AgentsSettings (vista principal) ────────────────────────────────────────

  it('muestra "Cargando agentes..." mientras las promesas están pendientes', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    expect(screen.getByText('Cargando agentes...')).toBeInTheDocument();
  });

  it('sin agentes activos muestra mensaje de vacío', async () => {
    mockLoad([], []);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    expect(await screen.findByText(/Sin agentes activos/)).toBeInTheDocument();
  });

  it('renderiza agentes con nombre de agent_templates y templateId fallback', async () => {
    mockLoad([
      makeAgent(1, 'bodega'),
      makeAgent(2, 'desconocido'),
      makeAgent(3, 'ventas', 'Instrucción', false), // sin agent_templates → usa templateId
    ], []);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    expect(await screen.findByText('Agente bodega')).toBeInTheDocument();
    expect(screen.getByText('ventas')).toBeInTheDocument(); // fallback templateId
  });

  it('fallo de red en carga inicial no rompe el componente', async () => {
    fetch.mockRejectedValue(new Error('red caída'));
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    expect(await screen.findByText(/Sin agentes activos/)).toBeInTheDocument();
  });

  // ── AgentCard ────────────────────────────────────────────────────────────────

  it('expandir AgentCard muestra el área de edición', async () => {
    mockLoad([makeAgent(1, 'bodega')], []);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');
    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));
    expect(screen.getByRole('button', { name: /desactivar agente/i })).toBeInTheDocument();
  });

  it('colapsar AgentCard oculta el área de edición', async () => {
    mockLoad([makeAgent(1, 'bodega')], []);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');
    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));
    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));
    expect(screen.queryByRole('button', { name: /desactivar agente/i })).not.toBeInTheDocument();
  });

  it('cambiar instrucciones activa el botón Guardar', async () => {
    mockLoad([makeAgent(1, 'bodega', 'Original')], []);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');
    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));

    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Nueva instrucción');

    expect(screen.getByRole('button', { name: /^guardar$/i })).not.toBeDisabled();
  });

  it('cambiar temperatura activa el botón Guardar', async () => {
    mockLoad([makeAgent(1, 'bodega')], []);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');
    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));

    const rangeInput = screen.getByRole('slider');
    fireEvent.change(rangeInput, { target: { value: '0.7' } });

    expect(screen.getByRole('button', { name: /^guardar$/i })).not.toBeDisabled();
  });

  it('guardar agente llama PUT y actualiza el estado', async () => {
    mockLoad([makeAgent(1, 'bodega', 'Original')], []);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');
    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));

    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Modificada');

    fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() => {
      const putCall = fetch.mock.calls.find(([, o]) => o?.method === 'PUT');
      expect(putCall).toBeTruthy();
      const body = JSON.parse(putCall[1].body);
      expect(body.custom_instructions).toBe('Modificada');
    });
  });

  it('desactivar agente llama DELETE y lo remueve de la lista', async () => {
    mockLoad([makeAgent(1, 'bodega'), makeAgent(2, 'ventas')], []);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');
    fireEvent.click(screen.getByRole('button', { name: /agente bodega/i }));
    fireEvent.click(screen.getByRole('button', { name: /desactivar agente/i }));

    await waitFor(() =>
      expect(screen.queryByText('Agente bodega')).not.toBeInTheDocument()
    );
    expect(screen.getByText('Agente ventas')).toBeInTheDocument();
  });

  // ── Botón "Añadir agente" y NuevoAgenteModal ─────────────────────────────────

  it('clic en "Añadir agente" abre el modal', async () => {
    mockLoad([], [makeTemplate('bodega')]);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText(/Sin agentes activos/);
    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));
    expect(screen.getByRole('heading', { name: /añadir agente/i })).toBeInTheDocument();
  });

  it('cancelar cierra el modal', async () => {
    mockLoad([], [makeTemplate('bodega')]);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText(/Sin agentes activos/);
    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByRole('heading', { name: /añadir agente/i })).not.toBeInTheDocument();
  });

  it('todos los templates ya activos → muestra mensaje de disponibles agotados', async () => {
    mockLoad([makeAgent(1, 'bodega')], [makeTemplate('bodega')]);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText('Agente bodega');
    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));
    expect(screen.getByText(/Todos los templates disponibles ya están activos/)).toBeInTheDocument();
  });

  it('submit sin tipo de agente muestra error de validación', async () => {
    mockLoad([], [makeTemplate('bodega')]);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText(/Sin agentes activos/);
    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));

    fireEvent.click(screen.getByRole('button', { name: /crear agente/i }));
    expect(screen.getByText(/Selecciona un tipo de agente/)).toBeInTheDocument();
  });

  it('submit sin instrucciones muestra error de validación', async () => {
    mockLoad([], [makeTemplate('bodega')]);
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText(/Sin agentes activos/);
    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bodega' } });
    fireEvent.click(screen.getByRole('button', { name: /crear agente/i }));
    expect(screen.getByText(/instrucciones son obligatorias/)).toBeInTheDocument();
  });

  it('submit OK crea el agente, cierra el modal y recarga la lista', async () => {
    let agentsCallCount = 0;
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'POST')
        return Promise.resolve({ ok: true, json: async () => ({ success: true, agent: makeAgent(99, 'bodega') }) });
      if (url.includes('/api/agents/templates'))
        return Promise.resolve({ json: async () => ({ success: true, templates: [makeTemplate('bodega')] }) });
      if (url.includes('/api/agents')) {
        agentsCallCount++;
        return Promise.resolve({
          json: async () => ({
            success: true,
            agents: agentsCallCount > 1 ? [makeAgent(99, 'bodega')] : [],
          }),
        });
      }
    });

    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText(/Sin agentes activos/);
    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bodega' } });
    await userEvent.type(screen.getByRole('textbox'), 'Instrucción nueva');

    fireEvent.click(screen.getByRole('button', { name: /crear agente/i }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /añadir agente/i })).not.toBeInTheDocument()
    );
  });

  it('submit con res.ok=false muestra el error del backend en el modal', async () => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'POST')
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Template no permitido.' }) });
      if (url.includes('/api/agents/templates'))
        return Promise.resolve({ json: async () => ({ success: true, templates: [makeTemplate('bodega')] }) });
      if (url.includes('/api/agents'))
        return Promise.resolve({ json: async () => ({ success: true, agents: [] }) });
    });

    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await screen.findByText(/Sin agentes activos/);
    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bodega' } });
    await userEvent.type(screen.getByRole('textbox'), 'Instrucción válida');

    fireEvent.click(screen.getByRole('button', { name: /crear agente/i }));

    expect(await screen.findByText(/Template no permitido/)).toBeInTheDocument();
  });
});
