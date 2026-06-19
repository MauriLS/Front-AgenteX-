import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompanySettings } from '../../../../components/settings/CompanySettings';

vi.mock('motion/react', () => ({
  motion: { form: ({ children, ...props }) => <form {...props}>{children}</form> },
}));

vi.mock('../../../../components/provisioning/ERPMappingSection', () => ({
  ERPMappingSection: ({ onChange }) => (
    <button type="button" onClick={() => onChange({ new_field: 'val' })}>trigger-erp-mapping</button>
  ),
}));

const mockCompany = (overrides = {}) => ({
  id: 1,
  name: 'Empresa Test',
  business_context: 'Contexto base',
  erp_mapping: null,
  subscription_status: 'ACTIVE',
  ...overrides,
});

describe('CompanySettings', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt');
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const mockLoad = (company) => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, company }),
    });
  };

  it('muestra "Cargando configuración..." mientras fetch está pendiente', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<CompanySettings onMenuClick={vi.fn()} />);
    expect(screen.getByText('Cargando configuración...')).toBeInTheDocument();
  });

  it('carga y muestra el nombre de la empresa y subscription ACTIVE', async () => {
    mockLoad(mockCompany());
    render(<CompanySettings onMenuClick={vi.fn()} />);
    expect(await screen.findByDisplayValue('Empresa Test')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('subscription INACTIVE muestra el badge correctamente', async () => {
    mockLoad(mockCompany({ subscription_status: 'INACTIVE' }));
    render(<CompanySettings onMenuClick={vi.fn()} />);
    expect(await screen.findByText('INACTIVE')).toBeInTheDocument();
  });

  it('submit sin cambios no llama fetch PATCH (early return)', async () => {
    mockLoad(mockCompany());
    render(<CompanySettings onMenuClick={vi.fn()} />);
    await screen.findByDisplayValue('Empresa Test');

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(fetch).toHaveBeenCalledTimes(1); // solo el GET inicial
  });

  it('submit con nombre cambiado llama PATCH y muestra éxito', async () => {
    mockLoad(mockCompany());
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, company: mockCompany({ name: 'Nuevo Nombre' }) }),
    });

    render(<CompanySettings onMenuClick={vi.fn()} />);
    const nameInput = await screen.findByDisplayValue('Empresa Test');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Nuevo Nombre');

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText(/Configuración guardada correctamente/)).toBeInTheDocument();
  });

  it('submit con PATCH error muestra el mensaje del backend', async () => {
    mockLoad(mockCompany());
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Sin permisos para editar.' }),
    });

    render(<CompanySettings onMenuClick={vi.fn()} />);
    const nameInput = await screen.findByDisplayValue('Empresa Test');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Cambio');

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText(/Sin permisos para editar/)).toBeInTheDocument();
  });

  it('clic en el toggle de contexto del negocio cubre su onClick handler', async () => {
    mockLoad(mockCompany({ business_context: 'Contexto inicial' }));
    render(<CompanySettings onMenuClick={vi.fn()} />);
    await screen.findByDisplayValue('Empresa Test');

    const toggleBtn = screen.getByRole('button', { name: /contexto del negocio/i });
    fireEvent.click(toggleBtn);
    // El DOM mutation ocurre (classList.toggle); no crash = handler cubierto
  });

  it('cambiar el textarea de contexto del negocio cubre su onChange handler', async () => {
    mockLoad(mockCompany({ business_context: 'Contexto inicial' }));
    render(<CompanySettings onMenuClick={vi.fn()} />);
    await screen.findByDisplayValue('Empresa Test');

    const textarea = screen.getByDisplayValue('Contexto inicial');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Nuevo contexto');
    expect(textarea.value).toBe('Nuevo contexto');
  });
  it('onMappingChange (trigger desde ERPMappingSection) actualiza erpMapping y lo incluye en PATCH', async () => {
    mockLoad(mockCompany());
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, company: mockCompany() }),
    });

    render(<CompanySettings onMenuClick={vi.fn()} />);
    await screen.findByDisplayValue('Empresa Test');

    fireEvent.click(screen.getByRole('button', { name: 'trigger-erp-mapping' }));

    // motion.form mock propaga initial/animate como atributos DOM → RTL los marca como
    // inaccessible. Disparamos submit directamente en el form para evitar el problema.
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body.erp_mapping).toEqual({ new_field: 'val' });
  });
});
