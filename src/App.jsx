import { useState } from 'react';
import { LoginScreen } from './components/auth/LoginScreen';
import { Sidebar } from './components/layout/Sidebar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (id) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false); // Cierra el menú en móviles al navegar
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  // Renderizador condicional de vistas 
  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <div className="p-8 text-slate-400">Contenido del Control Center (Dashboard pendiente)</div>;
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
      {/* Navegación Lateral */}
      <Sidebar 
        activeTab={activeTab} 
        onNavigate={handleNavigate} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Área Principal de Trabajo */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Botón temporal para abrir el menú en móviles */}
        <button 
          className="lg:hidden absolute top-4 right-4 z-50 text-white bg-blue-600 p-2 rounded"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          Menú
        </button>

        <div className="flex-1 flex flex-col min-w-0 bg-slate-950/50">
          {renderView()}
        </div>
      </main>
    </div>
  );
}

export default App;