// Seguridad — Expiración de sesión en vistas migradas a apiFetch
//
// Hallazgo documentado en CONTEXTO_TESTING_AGENTEX.md (Capa 5): 7 componentes
// usaban `fetch` directo contra endpoints protegidos sin manejar el 401,
// dejando vistas en un estado vacío/silencioso en vez de forzar logout.
// Se migraron a `apiFetch` (que centraliza el manejo de 401: limpia
// localStorage y redirige a /login). Esta suite fija ese contrato para
// cada componente migrado, evitando que alguien vuelva a un `fetch` directo
// sin darse cuenta de que pierde el manejo de sesión expirada.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CompaniesAdmin } from '../../components/admin/CompaniesAdmin';
import { SessionHistory } from '../../components/history/SessionHistory';
import { SessionDetail } from '../../components/history/SessionDetail';
import { AgentsSettings } from '../../components/settings/AgentsSettings';
import { CompanySettings } from '../../components/settings/CompanySettings';
import { ProfileSettings } from '../../components/settings/ProfileSettings';

vi.mock('motion/react', () => ({
  motion: {
    div:  ({ children, ...props }) => <div {...props}>{children}</div>,
    form: ({ children, ...props }) => <form {...props}>{children}</form>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('../../components/provisioning/ERPMappingSection', () => ({
  ERPMappingSection: () => <div />,
}));

const expectSessionPurgedAndRedirected = async () => {
  await waitFor(() => expect(window.location.href).toBe('/login'));
  expect(localStorage.getItem('token')).toBeNull();
  expect(localStorage.getItem('user')).toBeNull();
};

describe('Seguridad — sesión expirada (401) en vistas migradas a apiFetch', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt-expirado');
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'ADMIN' }));
    global.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false });
    delete window.location;
    window.location = { href: '' };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('CompaniesAdmin: 401 al cargar fuerza logout y redirige a /login', async () => {
    render(<CompaniesAdmin onMenuClick={vi.fn()} />);
    await expectSessionPurgedAndRedirected();
  });

  it('SessionHistory: 401 al cargar fuerza logout y redirige a /login', async () => {
    render(<SessionHistory onMenuClick={vi.fn()} onSelectSession={vi.fn()} />);
    await expectSessionPurgedAndRedirected();
  });

  it('SessionDetail: 401 al cargar mensajes fuerza logout y redirige a /login', async () => {
    render(<SessionDetail sessionId={1} onBack={vi.fn()} onMenuClick={vi.fn()} />);
    await expectSessionPurgedAndRedirected();
  });

  it('AgentsSettings: 401 al cargar agentes/templates fuerza logout y redirige a /login', async () => {
    render(<AgentsSettings onMenuClick={vi.fn()} />);
    await expectSessionPurgedAndRedirected();
  });

  it('CompanySettings: 401 al cargar la empresa fuerza logout y redirige a /login', async () => {
    render(<CompanySettings onMenuClick={vi.fn()} />);
    await expectSessionPurgedAndRedirected();
  });

  it('ProfileSettings: 401 al cargar el perfil fuerza logout y redirige a /login', async () => {
    render(<ProfileSettings onMenuClick={vi.fn()} />);
    await expectSessionPurgedAndRedirected();
  });
});