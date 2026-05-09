import { useState } from 'react';
import { LoginScreen } from './components/auth/LoginScreen';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard'; 
import { ChatInterface } from './components/chat/ChatInterface';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (id) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onMenuClick={toggleMobileMenu} />; 
      case 'bodega':
      case 'ventas':
      case 'analitica':
        // 👉 INYECCIÓN DEL CHAT REAL PARA LOS AGENTES
        return <ChatInterface agentId={activeTab} onMenuClick={toggleMobileMenu} />;
      case 'settings':
        return <div className="p-8 text-slate-400">Pantalla de Configuración</div>;
      default:
        return <div className="p-8">Vista no encontrada</div>;
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
}

export default App;