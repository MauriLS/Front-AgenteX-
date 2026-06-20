// Regresión — BUG-FE-02
//
// Candidato documentado durante el proceso de testing (no es un bug que haya
// llegado a producción, pero es un comportamiento crítico y no obvio que ya
// fue cubierto por tests sin documentarse formalmente como regresión):
// `extraerClaves()` en ERPMappingSection.jsx usa `parsed[0]` cuando el JSON
// pegado es un array, y el objeto completo cuando no lo es. Si alguien
// simplifica esa lógica a solo `JSON.parse(...)` sin la rama de array,
// pegar un array de ejemplo (el caso más común al copiar una respuesta de
// API REST) dejaría de detectar columnas.
//
// Este test fija ese contrato: array → primer elemento, objeto → el objeto
// mismo, y array vacío → error controlado (no debe lanzar excepción).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ERPMappingSection } from '../../components/provisioning/ERPMappingSection';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('Regresión — BUG-FE-02: extracción de claves desde JSON array vs objeto', () => {
  let onChange;

  beforeEach(() => {
    onChange = vi.fn();
  });

  const openSection = () => {
    fireEvent.click(screen.getByRole('button', { name: /mapeo de campos erp/i }));
  };

  const pasteAndDetect = (json) => {
    const textareas = screen.getAllByRole('textbox');
    const jsonTextarea = textareas.find((t) => t.placeholder?.includes('{'));
    fireEvent.change(jsonTextarea, { target: { value: json } });
    fireEvent.click(screen.getAllByRole('button', { name: /detectar campos/i })[0]);
  };

  it('array con un objeto → usa parsed[0], no las claves del array', () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    pasteAndDetect('[{"id_articulo": 217, "cantidad_disponible": 5}]');

    expect(screen.getByText('id_articulo')).toBeInTheDocument();
    expect(screen.getByText('cantidad_disponible')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('array con varios objetos → solo toma las claves del primero, ignora el resto', () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    pasteAndDetect('[{"id": 1, "nombre": "A"}, {"id": 2, "nombre": "B", "extra_solo_en_el_segundo": true}]');

    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('nombre')).toBeInTheDocument();
    expect(screen.queryByText('extra_solo_en_el_segundo')).not.toBeInTheDocument();
  });

  it('objeto plano (no array) → usa sus propias claves directamente', () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    pasteAndDetect('{"sku": "ABC", "stock": 5}');

    expect(screen.getByText('sku')).toBeInTheDocument();
    expect(screen.getByText('stock')).toBeInTheDocument();
  });

  it('array vacío → muestra error controlado en vez de romper', () => {
    render(<ERPMappingSection onChange={onChange} />);
    openSection();
    pasteAndDetect('[]');

    expect(screen.getByText(/JSON inválido/)).toBeInTheDocument();
  });
});