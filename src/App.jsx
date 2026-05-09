import { LoginScreen } from './components/auth/LoginScreen';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { useState, useEffect } from 'react';
import { ChatInterface } from './components/chat/ChatInterface';

function App() {
  // 1. ZONA DE DECLARACIÓN ESTRICTA (Todos los hooks van arriba)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 🔥 PERSISTENCIA DE SESIÓN (Se evalúa SIEMPRE, sin importar el estado)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // 2. LÓGICA DE CONTROL
  const handleNavigate = (id) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // 3. RENDERIZADO CONDICIONAL (Solo DESPUÉS de que todos los hooks han sido declarados)
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