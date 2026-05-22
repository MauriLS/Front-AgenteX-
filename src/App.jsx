// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';

import { LoginScreen }     from './components/auth/LoginScreen';
import { RegisterB2B }     from './components/auth/Register';
import { Sidebar }         from './components/layout/Sidebar';
import { Dashboard }       from './components/dashboard/Dashboard';
import { ChatInterface }   from './components/chat/ChatInterface';
import { ProfileSettings } from './components/settings/ProfileSettings';
import { SessionHistory }  from './components/history/SessionHistory';
import { SessionDetail }   from './components/history/SessionDetail';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

const CoreSystem = () => {
  const [activeTab,        setActiveTab]        = useState('dashboard');
  const [selectedSession,  setSelectedSession]  = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate   = (id) => { setActiveTab(id); setSelectedSession(null); setIsMobileMenuOpen(false); };
  const toggleMobileMenu = () => setIsMobileMenuOpen(p => !p);

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onMenuClick={toggleMobileMenu} onNavigate={handleNavigate} />;
      case 'provisioning':
        return <RegisterB2B />;
      case 'settings':
        return <ProfileSettings onMenuClick={toggleMobileMenu} />;
      case 'history':
        return selectedSession
          ? <SessionDetail
              sessionId={selectedSession}
              onBack={() => setSelectedSession(null)}
              onMenuClick={toggleMobileMenu}
            />
          : <SessionHistory
              onMenuClick={toggleMobileMenu}
              onSelectSession={(id) => setSelectedSession(id)}
            />;
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
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950">{renderView()}</div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"      element={<Navigate to="/app" replace />} />
        <Route path="/login" element={<LoginScreen onLogin={() => { window.location.href = '/app'; }} />} />
        <Route path="/app/*" element={<PrivateRoute><CoreSystem /></PrivateRoute>} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
