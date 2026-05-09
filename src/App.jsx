import { useState } from 'react';
import { LoginScreen } from './components/auth/LoginScreen';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard'; // 👉 NUEVO IMPORT

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
        // 👉 INYECCIÓN DEL DASHBOARD
        return <Dashboard onMenuClick={toggleMobileMenu} />; 
      case 'bodega':
        return <div className="p-8 text-amber-500">Interfaz del Agente de Bodega (Chat pendiente)</div>;
      case 'ventas':
        return <div className="p-8 text-emerald-500">Interfaz del Agente de Ventas (Chat pendiente)</div>;
      case 'analitica':
        return <div className="p-8 text-blue-500">Interfaz de Analítica (Chat pendiente)</div>;
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