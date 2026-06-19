import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../App';

vi.mock('../../components/auth/LoginScreen', () => ({
  LoginScreen: () => <div>LoginScreen</div>,
}));
vi.mock('../../components/auth/Register', () => ({
  RegisterB2B: () => <div>RegisterB2B</div>,
}));
vi.mock('../../components/layout/Sidebar', () => ({
  Sidebar: ({ onNavigate, onClose }) => (
    <div>
      <button onClick={() => onNavigate('dashboard')}>nav-dashboard</button>
      <button onClick={() => onNavigate('settings')}>nav-settings</button>
      <button onClick={() => onNavigate('agents')}>nav-agents</button>
      <button onClick={() => onNavigate('company')}>nav-company</button>
      <button onClick={() => onNavigate('users')}>nav-users</button>
      <button onClick={() => onNavigate('companies')}>nav-companies</button>
      <button onClick={() => onNavigate('history')}>nav-history</button>
      <button onClick={() => onNavigate('provisioning')}>nav-provisioning</button>
      <button onClick={() => onNavigate('agente-x')}>nav-agente-x</button>
      <button onClick={onClose}>sidebar-close</button>
    </div>
  ),
}));
vi.mock('../../components/dashboard/Dashboard', () => ({
  Dashboard: ({ onMenuClick }) => (
    <div>
      Dashboard
      <button onClick={onMenuClick}>menu-btn</button>
    </div>
  ),
}));
vi.mock('../../components/chat/ChatInterface', () => ({
  ChatInterface: ({ agentId }) => <div>ChatInterface-{agentId}</div>,
}));
vi.mock('../../components/settings/ProfileSettings', () => ({
  ProfileSettings: () => <div>ProfileSettings</div>,
}));
vi.mock('../../components/settings/AgentsSettings', () => ({
  AgentsSettings: () => <div>AgentsSettings</div>,
}));
vi.mock('../../components/settings/CompanySettings', () => ({
  CompanySettings: () => <div>CompanySettings</div>,
}));
vi.mock('../../components/settings/UsersSettings', () => ({
  UsersSettings: () => <div>UsersSettings</div>,
}));
vi.mock('../../components/admin/CompaniesAdmin', () => ({
  CompaniesAdmin: () => <div>CompaniesAdmin</div>,
}));
vi.mock('../../components/history/SessionHistory', () => ({
  SessionHistory: ({ onSelectSession }) => (
    <div>
      SessionHistory
      <button onClick={() => onSelectSession('sess-1')}>select-session</button>
    </div>
  ),
}));
vi.mock('../../components/history/SessionDetail', () => ({
  SessionDetail: ({ sessionId, onBack }) => (
    <div>
      SessionDetail-{sessionId}
      <button onClick={onBack}>back</button>
    </div>
  ),
}));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  describe('PrivateRoute', () => {
    it('sin token redirige a /login y muestra LoginScreen', () => {
      render(<App />);
      expect(screen.getByText('LoginScreen')).toBeInTheDocument();
    });

    it('con token en localStorage muestra CoreSystem con Dashboard por defecto', () => {
      localStorage.setItem('token', 'jwt');
      render(<App />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('CoreSystem renderView()', () => {
    beforeEach(() => localStorage.setItem('token', 'jwt'));

    it.each([
      ['settings',     'ProfileSettings'],
      ['agents',       'AgentsSettings'],
      ['company',      'CompanySettings'],
      ['users',        'UsersSettings'],
      ['companies',    'CompaniesAdmin'],
      ['provisioning', 'RegisterB2B'],
    ])('tab "%s" → %s', (tab, expected) => {
      render(<App />);
      fireEvent.click(screen.getByText(`nav-${tab}`));
      expect(screen.getByText(expected)).toBeInTheDocument();
    });

    it('tab desconocido → ChatInterface con el agentId correcto', () => {
      render(<App />);
      fireEvent.click(screen.getByText('nav-agente-x'));
      expect(screen.getByText('ChatInterface-agente-x')).toBeInTheDocument();
    });

    it('history sin sesión → SessionHistory', () => {
      render(<App />);
      fireEvent.click(screen.getByText('nav-history'));
      expect(screen.getByText('SessionHistory')).toBeInTheDocument();
    });

    it('history → seleccionar sesión → SessionDetail; onBack → vuelve a SessionHistory', () => {
      render(<App />);
      fireEvent.click(screen.getByText('nav-history'));
      fireEvent.click(screen.getByText('select-session'));
      expect(screen.getByText('SessionDetail-sess-1')).toBeInTheDocument();

      fireEvent.click(screen.getByText('back'));
      expect(screen.getByText('SessionHistory')).toBeInTheDocument();
    });

    it('handleNavigate resetea selectedSession al cambiar de tab', () => {
      render(<App />);
      fireEvent.click(screen.getByText('nav-history'));
      fireEvent.click(screen.getByText('select-session'));
      expect(screen.getByText('SessionDetail-sess-1')).toBeInTheDocument();

      fireEvent.click(screen.getByText('nav-dashboard'));
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      fireEvent.click(screen.getByText('nav-history'));
      expect(screen.getByText('SessionHistory')).toBeInTheDocument();
    });

    it('toggleMobileMenu no rompe el renderizado', () => {
      render(<App />);
      fireEvent.click(screen.getByText('menu-btn'));
      fireEvent.click(screen.getByText('menu-btn'));
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
