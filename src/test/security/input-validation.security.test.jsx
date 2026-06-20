// Seguridad — Validación de campos requeridos
//
// LoginScreen y Register dependen del atributo HTML `required` en los <input>
// para bloquear el envío del formulario con campos vacíos, sin lógica de
// validación propia en JS. Esta suite usa userEvent.click (que respeta la
// validación nativa de constraint validation del navegador/jsdom, a
// diferencia de fireEvent.submit que la salta) para confirmar que ningún
// fetch se dispara si los campos obligatorios están vacíos — evita que un
// futuro refactor elimine el atributo `required` sin que nadie lo note.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from '../../components/auth/LoginScreen';
import { RegisterB2B } from '../../components/auth/Register';

vi.mock('motion/react', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('../../components/provisioning/ERPMappingSection', () => ({
  ERPMappingSection: () => <div />,
}));

describe('Seguridad — campos requeridos bloquean el envío', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('LoginScreen: formulario vacío no dispara fetch', async () => {
    render(<LoginScreen onLogin={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /initialize system/i }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('LoginScreen: solo email sin password no dispara fetch', async () => {
    render(<LoginScreen onLogin={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('u-id@enterprise.x'), 'admin@agentex.test');
    await userEvent.click(screen.getByRole('button', { name: /initialize system/i }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Register: formulario vacío no dispara fetch', async () => {
    render(<RegisterB2B />);
    await userEvent.click(screen.getByRole('button', { name: /ejecutar despliegue/i }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Register: falta password no dispara fetch aunque el resto esté completo', async () => {
    render(<RegisterB2B />);
    await userEvent.type(document.querySelector('input[name="company_name"]'), 'Empresa Demo');
    await userEvent.type(document.querySelector('input[name="username"]'), 'admin.demo');
    await userEvent.type(document.querySelector('input[name="email"]'), 'admin@demo.com');
    // password queda vacío a propósito
    await userEvent.click(screen.getByRole('button', { name: /ejecutar despliegue/i }));
    expect(fetch).not.toHaveBeenCalled();
  });
});