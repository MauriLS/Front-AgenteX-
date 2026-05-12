import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';

// Importaciones de tus componentes visuales
import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterB2B } from './components/auth/Register'; 
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { ChatInterface } from './components/chat/ChatInterface';

// ==========================================
// 1. EL BLINDAJE B2B (Middleware de Frontend)
// ==========================================
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  // Si no hay token en el navegador, lo expulsamos inmediatamente al login
  return token ? children : <Navigate to="/login" replace />;
};

// ==========================================
// 2. EL ECOSISTEMA PRIVADO (Tu código actual encapsulado)
// ==========================================
const CoreSystem = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (id) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onMenuClick={toggleMobileMenu} />; 
      //  NUEVA VISTA: Solo tú (Admin Maestro) la verás
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

// ==========================================
// 3. EL ENRUTADOR PRINCIPAL (El controlador de tráfico)
// ==========================================
function App() {
  return (
    <Router>
      <Routes>
        {/* Redirección raíz: Si entran a /, los mandamos a la app. Si no tienen token, PrivateRoute los echa al login */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        
        {/* ZONA PÚBLICA */}
        <Route 
          path="/login" 
          element={
            <LoginScreen 
              onLogin={() => {
                // Al hacer login exitoso, recargamos hacia el ecosistema privado
                window.location.href = '/app'; 
              }} 
            />
          } 
        />  

        {/* ZONA PRIVADA (Protegida) */}
        <Route 
          path="/app/*" 
          element={
            <PrivateRoute>
              <CoreSystem />
            </PrivateRoute>
          } 
        />

        {/* Fallback 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;