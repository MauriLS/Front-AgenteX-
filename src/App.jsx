import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';

import { LoginScreen }  from './components/auth/LoginScreen';
import { RegisterB2B }  from './components/auth/Register';
import { Sidebar }      from './components/layout/Sidebar';
import { Dashboard }    from './components/dashboard/Dashboard';
import { ChatInterface } from './components/chat/ChatInterface';

// ── Blindaje B2B ─────────────────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// ── Ecosistema privado ────────────────────────────────────────────────────────
const CoreSystem = () => {
  const [activeTab, setActiveTab]           = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (id) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onMenuClick={toggleMobileMenu}
            onNavigate={handleNavigate}   // ← necesario para que las cards sean clickeables
          />
        );
      case 'provisioning':
        return <RegisterB2B />;
      case 'settings':
        return <div className="p-8 text-slate-400">Configuración de Perfil</div>;
      default:
        return <ChatInterface agentId={activeTab} onMenuClick={toggleMobileMenu} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans">
      <Sidebar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

// ── Enrutador principal ───────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"       element={<Navigate to="/app" replace />} />
        <Route
          path="/login"
          element={
            <LoginScreen
              onLogin={() => { window.location.href = '/app'; }}
            />
          }
        />
        <Route
          path="/app/*"
          element={
            <PrivateRoute>
              <CoreSystem />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
