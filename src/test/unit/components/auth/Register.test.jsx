import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterB2B } from '../../../../components/auth/Register';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('../../../../components/provisioning/ERPMappingSection', () => ({
  ERPMappingSection: ({ onChange }) => (
    <div>
      <button type="button" onClick={() => onChange({ campo: 'val' })}>trigger-mapping</button>
    </div>
  ),
}));

describe('RegisterB2B', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renderiza el formulario con los campos base', () => {
    render(<RegisterB2B />);
    expect(screen.getByText('Despliegue de Infraestructura B2B')).toBeInTheDocument();
    expect(screen.getByText(/Identidad Corporativa/)).toBeInTheDocument();
    expect(document.querySelector('input[name="company_name"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="username"]')).toBeInTheDocument();
  });

  it('addAgent añade un segundo agente de tipo ventas', () => {
    render(<RegisterB2B />);
    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
    expect(selects[1].value).toBe('ventas');
  });

  it('removeAgent elimina el agente si hay más de uno', () => {
    render(<RegisterB2B />);
    fireEvent.click(screen.getByRole('button', { name: /añadir agente/i }));
    expect(screen.getAllByRole('combobox')).toHaveLength(2);

    // El botón de eliminar aparece solo cuando hay más de 1 agente
    const trashBtns = screen.getAllByRole('button').filter(
      (b) => b.querySelector('svg') && !b.textContent.trim()
    );
    fireEvent.click(trashBtns[0]);
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('toggle showContext muestra y oculta el textarea de contexto del negocio', () => {
    render(<RegisterB2B />);
    const toggleBtn = screen.getByRole('button', { name: /contexto del negocio/i });
    // Antes del click el textarea no existe
    expect(screen.queryByPlaceholderText(/goma/)).not.toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(screen.getByPlaceholderText(/goma/)).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(screen.queryByPlaceholderText(/goma/)).not.toBeInTheDocument();
  });

  it('cambiar template a "ventas" muestra panel de configuración de ventas', () => {
    render(<RegisterB2B />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'ventas' } });
    expect(screen.getByText(/Configuración de fuentes de datos/)).toBeInTheDocument();
  });

  it('cambiar template a "analitica" muestra placeholder de analista', () => {
    render(<RegisterB2B />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'analitica' } });
    expect(screen.getByPlaceholderText(/analista/i)).toBeInTheDocument();
  });

  it('handleBaseChange actualiza el campo al escribir', async () => {
    render(<RegisterB2B />);
    const companyInput = document.querySelector('input[name="company_name"]');
    await userEvent.type(companyInput, 'Mi Empresa');
    expect(companyInput.value).toBe('Mi Empresa');
  });

  it('handleSalesConfigChange actualiza URL del agente de ventas', async () => {
    render(<RegisterB2B />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ventas' } });

    const urlInput = screen.getByPlaceholderText('https://api.empresa.com/clientes');
    await userEvent.type(urlInput, 'https://mi.api.com/clientes');
    expect(urlInput.value).toBe('https://mi.api.com/clientes');
  });

  it('submit sin token muestra error de token no encontrado', async () => {
    localStorage.removeItem('token');
    render(<RegisterB2B />);
    const form = screen.getByText('EJECUTAR DESPLIEGUE EN PRODUCCIÓN').closest('form');
    fireEvent.submit(form);
    expect(await screen.findByText(/Token de administrador no encontrado/)).toBeInTheDocument();
  });

  it('submit exitoso: muestra mensaje de éxito y resetea el formulario', async () => {
    localStorage.setItem('token', 'jwt');
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Empresa desplegada correctamente.' }),
    });

    render(<RegisterB2B />);
    await userEvent.type(document.querySelector('input[name="company_name"]'), 'Empresa Test');

    const form = screen.getByText('EJECUTAR DESPLIEGUE EN PRODUCCIÓN').closest('form');
    fireEvent.submit(form);

    expect(await screen.findByText(/Empresa desplegada correctamente/)).toBeInTheDocument();
    expect(document.querySelector('input[name="company_name"]').value).toBe('');
  });

  it('submit con res.ok=false muestra el error del backend', async () => {
    localStorage.setItem('token', 'jwt');
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Email ya registrado.' }),
    });

    render(<RegisterB2B />);
    const form = screen.getByText('EJECUTAR DESPLIEGUE EN PRODUCCIÓN').closest('form');
    fireEvent.submit(form);

    expect(await screen.findByText(/Email ya registrado/)).toBeInTheDocument();
  });

  it('onMappingChange (desde ERPMappingSection) actualiza erpMapping', () => {
    localStorage.setItem('token', 'jwt');
    render(<RegisterB2B />);
    fireEvent.click(screen.getByRole('button', { name: 'trigger-mapping' }));
    // No crash → erpMapping se actualiza correctamente
  });

  it('submit con agente de ventas construye mappingFinal con URLs de ventas', async () => {
    localStorage.setItem('token', 'jwt');
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'OK' }),
    });

    render(<RegisterB2B />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ventas' } });
    await userEvent.type(
      screen.getByPlaceholderText('https://api.empresa.com/clientes'),
      'https://mi.api/clientes'
    );

    const form = screen.getByText('EJECUTAR DESPLIEGUE EN PRODUCCIÓN').closest('form');
    fireEvent.submit(form);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.erp_mapping?.clientes_url).toBe('https://mi.api/clientes');
  });
});
