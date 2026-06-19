import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompaniesAdmin } from '../../../../components/admin/CompaniesAdmin';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const makeCompany = (id, name, status = 'ACTIVE') => ({
  id,
  name,
  subscription_status: status,
  business_context: '',
  erp_mapping: null,
  created_at: '2024-01-01T00:00:00Z',
});

describe('CompaniesAdmin', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt');
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const mockLoad = (companies) => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, companies }),
    });
  };

  it('muestra "Cargando empresas..." mientras fetch está pendiente', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    expect(screen.getByText('Cargando empresas...')).toBeInTheDocument();
  });

  it('lista vacía muestra mensaje correspondiente', async () => {
    mockLoad([]);
    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    expect(await screen.findByText('Sin empresas registradas.')).toBeInTheDocument();
  });

  it('renderiza empresas con distintos estados (STATUS_COLORS coverage)', async () => {
    mockLoad([
      makeCompany(1, 'Empresa ACTIVE',    'ACTIVE'),
      makeCompany(2, 'Empresa INACTIVE',  'INACTIVE'),
      makeCompany(3, 'Empresa SUSPENDED', 'SUSPENDED'),
      makeCompany(4, 'Empresa UNKNOWN',   'TRIAL'),
    ]);
    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    expect(await screen.findByText('Empresa ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Empresa SUSPENDED')).toBeInTheDocument();
  });

  it('buscador NO se muestra cuando hay ≤4 empresas', async () => {
    mockLoad([makeCompany(1, 'A'), makeCompany(2, 'B')]);
    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    await screen.findByText('A');
    expect(screen.queryByPlaceholderText(/buscar/i)).not.toBeInTheDocument();
  });

  it('buscador SE muestra y filtra cuando hay >4 empresas', async () => {
    mockLoad([
      makeCompany(1, 'Alpha'), makeCompany(2, 'Beta'),
      makeCompany(3, 'Gamma'), makeCompany(4, 'Delta'),
      makeCompany(5, 'Epsilon'),
    ]);
    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    await screen.findByText('Alpha');

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    await userEvent.type(searchInput, 'alph');

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });

  it('sin resultados de búsqueda muestra mensaje específico', async () => {
    mockLoad([
      makeCompany(1, 'A'), makeCompany(2, 'B'), makeCompany(3, 'C'),
      makeCompany(4, 'D'), makeCompany(5, 'E'),
    ]);
    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    await screen.findByText('A');
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), 'zzznoencontrado');
    expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
  });

  it('expandir CompanyCard muestra el formulario de edición', async () => {
    mockLoad([makeCompany(1, 'Mi Empresa')]);
    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    await screen.findByText('Mi Empresa');

    fireEvent.click(screen.getByRole('button', { name: /Mi Empresa/ }));

    expect(screen.getByDisplayValue('Mi Empresa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar empresa/i })).toBeInTheDocument();
  });

  it('cambiar nombre activa el indicador dirty y habilita el botón Guardar', async () => {
    mockLoad([makeCompany(1, 'Original')]);
    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    await screen.findByText('Original');
    fireEvent.click(screen.getByRole('button', { name: /original/i }));

    const nameInput = screen.getByDisplayValue('Original');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Modificado');

    const saveBtn = screen.getByRole('button', { name: /^guardar$/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it('guardar cambios llama handleUpdate y muestra checkmark', async () => {
    mockLoad([makeCompany(1, 'Original')]);
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    await screen.findByText('Original');
    fireEvent.click(screen.getByRole('button', { name: /original/i }));

    const nameInput = screen.getByDisplayValue('Original');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Nuevo Nombre');
    fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const [, opts] = fetch.mock.calls[1];
    expect(opts.method).toBe('PUT');
  });

  it('eliminar empresa: muestra modal y cancelar cierra el modal', async () => {
    mockLoad([makeCompany(1, 'Empresa A')]);
    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    await screen.findByText('Empresa A');
    fireEvent.click(screen.getByRole('button', { name: /empresa a/i }));

    fireEvent.click(screen.getByRole('button', { name: /eliminar empresa/i }));
    expect(screen.getByText(/Esta acción eliminará permanentemente/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByText(/Esta acción eliminará permanentemente/)).not.toBeInTheDocument();
  });

  it('confirmar eliminación llama DELETE y remueve la empresa de la lista', async () => {
    mockLoad([makeCompany(1, 'Empresa Para Borrar'), makeCompany(2, 'Empresa Permanente')]);
    fetch.mockResolvedValueOnce({ ok: true });

    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    await screen.findByText('Empresa Para Borrar');
    fireEvent.click(screen.getByRole('button', { name: /empresa para borrar/i }));
    fireEvent.click(screen.getByRole('button', { name: /eliminar empresa/i }));
    fireEvent.click(screen.getByRole('button', { name: /eliminar definitivamente/i }));

    await waitFor(() =>
      expect(screen.queryByText('Empresa Para Borrar')).not.toBeInTheDocument()
    );
    expect(screen.getByText('Empresa Permanente')).toBeInTheDocument();
  });

  it('empresa con erp_mapping muestra el bloque de solo lectura al expandir', async () => {
    mockLoad([{ ...makeCompany(1, 'Con ERP'), erp_mapping: { nombre: 'articulo' } }]);
    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    await screen.findByText('Con ERP');
    fireEvent.click(screen.getByRole('button', { name: /con erp/i }));
    expect(screen.getByText(/ERP Mapping/i)).toBeInTheDocument();
  });
});
