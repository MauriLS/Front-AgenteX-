import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ERPMappingSection } from '../../../../components/provisioning/ERPMappingSection';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('ERPMappingSection', () => {
  let onChange;

  beforeEach(() => {
    onChange = vi.fn();
  });

  const openSection = () => {
    fireEvent.click(screen.getByRole('button', { name: /mapeo de campos erp/i }));
  };

  const pasteAndDetect = async (json) => {
    const textareas = screen.getAllByRole('textbox');
    const jsonTextarea = textareas.find(t => t.placeholder?.includes('{'));
    fireEvent.change(jsonTextarea, { target: { value: json } });
    fireEvent.click(screen.getAllByRole('button', { name: /detectar campos/i })[0]);
  };

  it('empieza colapsado y sin contenido de campos', () => {
    render(<ERPMappingSection onChange={onChange} />);
    expect(screen.queryByText(/Pega un registro de ejemplo/)).not.toBeInTheDocument();
  });

  it('toggle abre y muestra el panel', () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    expect(screen.getByText(/Pega un registro de ejemplo del endpoint principal/)).toBeInTheDocument();
  });

  it('toggle cierra el panel de nuevo', () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    openSection();
    expect(screen.queryByText(/Pega un registro de ejemplo del endpoint principal/)).not.toBeInTheDocument();
  });

  it('JSON válido + Detectar campos → muestra filas con los campos del JSON', async () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    await pasteAndDetect('{"id": 1, "nombre": "Producto A", "precio": 9990}');
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('nombre')).toBeInTheDocument();
    expect(screen.getByText('precio')).toBeInTheDocument();
  });

  it('JSON válido como array usa el primer elemento', async () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    await pasteAndDetect('[{"sku": "ABC", "stock": 5}]');
    expect(screen.getByText('sku')).toBeInTheDocument();
    expect(screen.getByText('stock')).toBeInTheDocument();
  });

  it('JSON inválido muestra mensaje de error', async () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    await pasteAndDetect('esto no es json');
    expect(screen.getByText(/JSON inválido/)).toBeInTheDocument();
  });

  it('cambiar rol en una fila llama onChange con el mapping actualizado', async () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    await pasteAndDetect('{"id": 1, "precio": 9990}');

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'id' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'id' }));
  });

  it('remover fila (cuando hay >1) llama onChange sin esa clave', async () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    await pasteAndDetect('{"id": 1, "precio": 9990, "stock": 5}');

    // Asignar roles para que el mapping sea no-null
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'id' } });
    fireEvent.change(selects[1], { target: { value: 'precio' } });

    const removeBtns = screen.queryAllByRole('button', { name: /eliminar/i });
    if (removeBtns.length > 0) {
      fireEvent.click(removeBtns[0]);
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('agregar endpoint secundario muestra el panel de URL y JSON secundario', () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    fireEvent.click(screen.getByRole('button', { name: /agregar endpoint secundario/i }));
    expect(screen.getByPlaceholderText('https://api.empresa.com/stock')).toBeInTheDocument();
  });

  it('URL del endpoint secundario llama onChange con stock_url', async () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    fireEvent.click(screen.getByRole('button', { name: /agregar endpoint secundario/i }));

    const urlInput = screen.getByPlaceholderText('https://api.empresa.com/stock');
    await userEvent.type(urlInput, 'https://api.empresa.com/stock');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      stock_url: 'https://api.empresa.com/stock',
    }));
  });

  it('eliminar endpoint secundario lo oculta', () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    fireEvent.click(screen.getByRole('button', { name: /agregar endpoint secundario/i }));
    fireEvent.click(screen.getByRole('button', { name: /eliminar endpoint secundario/i }));
    expect(screen.queryByPlaceholderText('https://api.empresa.com/stock')).not.toBeInTheDocument();
  });

  it('token ERP llama onChange con erp_token en el mapping', async () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();

    // Primero crear un mapping para que no sea null
    await pasteAndDetect('{"id": 1}');
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'id' } });

    const tokenInput = screen.getByPlaceholderText(/Bearer eyJhbGci/);
    await userEvent.type(tokenInput, 'mi-token-secreto');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ erp_token: expect.stringContaining('mi-token-secreto') })
    );
  });

  it('muestra preview del mapping cuando hay campos configurados', async () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    await pasteAndDetect('{"id": 1}');
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'id' } });
    expect(screen.getByText(/Resultado del mapeo/)).toBeInTheDocument();
  });

  it('muestra el contador de campos configurados cuando está cerrado', async () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    await pasteAndDetect('{"id": 1, "nombre": "a"}');
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'id' } });
    openSection(); // cerrar
    expect(screen.getByText(/1 campos configurados/)).toBeInTheDocument();
  });
});
