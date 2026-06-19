import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSettings } from '../../../../components/settings/ProfileSettings';

vi.mock('motion/react', () => ({
  motion: { form: ({ children, ...props }) => <form {...props}>{children}</form> },
}));

describe('ProfileSettings', () => {
  let onMenuClick;

  beforeEach(() => {
    localStorage.setItem('token', 'jwt-test');
    global.fetch = vi.fn();
    onMenuClick = vi.fn();
  });

  const mockLoad = (user = { username: 'rayker', email: 'r@x.com' }) =>
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, user }) });

  it('muestra "Cargando perfil..." mientras fetch está pendiente', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<ProfileSettings onMenuClick={onMenuClick} />);
    expect(screen.getByText('Cargando perfil...')).toBeInTheDocument();
  });

  it('rellena el form con username y email del usuario al cargar', async () => {
    mockLoad();
    render(<ProfileSettings onMenuClick={onMenuClick} />);
    expect(await screen.findByDisplayValue('rayker')).toBeInTheDocument();
    expect(screen.getByDisplayValue('r@x.com')).toBeInTheDocument();
  });

  it('error inline "No coinciden" cuando password !== confirm mientras se escribe', async () => {
    mockLoad();
    render(<ProfileSettings onMenuClick={onMenuClick} />);
    await screen.findByDisplayValue('rayker');

    const [newPwd, confirmPwd] = screen.getAllByPlaceholderText('••••••••');
    await userEvent.type(newPwd, 'abc123');
    await userEvent.type(confirmPwd, 'diferente');

    expect(screen.getByText('No coinciden')).toBeInTheDocument();
  });

  it('submit con passwords distintas: muestra error de validación y no llama fetch PUT', async () => {
    mockLoad();
    render(<ProfileSettings onMenuClick={onMenuClick} />);
    await screen.findByDisplayValue('rayker');

    const [newPwd, confirmPwd] = screen.getAllByPlaceholderText('••••••••');
    await userEvent.type(newPwd, 'abc123');
    await userEvent.type(confirmPwd, 'diferente');

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(screen.getByText(/Las contraseñas no coinciden/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1); // solo el GET inicial
  });

  it('submit OK: muestra banner de éxito y limpia los campos de contraseña', async () => {
    mockLoad();
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

    render(<ProfileSettings onMenuClick={onMenuClick} />);
    await screen.findByDisplayValue('rayker');

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText(/Cambios guardados correctamente/)).toBeInTheDocument();
    const [newPwd] = screen.getAllByPlaceholderText('••••••••');
    expect(newPwd.value).toBe('');
  });

  it('submit con res.ok=false muestra el error del backend', async () => {
    mockLoad();
    fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Email ya en uso.' }) });

    render(<ProfileSettings onMenuClick={onMenuClick} />);
    await screen.findByDisplayValue('rayker');

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText(/Email ya en uso\./)).toBeInTheDocument();
  });

  it('onChange de username y email cubre los handlers de todos los campos', async () => {
    mockLoad();
    render(<ProfileSettings onMenuClick={onMenuClick} />);
    const usernameInput = await screen.findByDisplayValue('rayker');
    const emailInput = screen.getByDisplayValue('r@x.com');

    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, 'newuser');
    expect(usernameInput.value).toBe('newuser');

    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'new@x.com');
    expect(emailInput.value).toBe('new@x.com');
  });

  it('fallo de red en submit muestra el mensaje de error genérico', async () => {
    mockLoad();
    fetch.mockRejectedValueOnce(new Error('red caída'));

    render(<ProfileSettings onMenuClick={onMenuClick} />);
    await screen.findByDisplayValue('rayker');

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText(/red caída/)).toBeInTheDocument();
  });
});
