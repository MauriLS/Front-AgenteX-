import { useState } from 'react';
import { LoginScreen } from './components/auth/LoginScreen';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  // Si está autenticado, por ahora mostramos una pantalla de éxito temporal
  // hasta que migremos el Dashboard y el Sidebar.
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-mono">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 flex items-center justify-center rounded-full mx-auto animate-pulse">
          ✓
        </div>
        <h1 className="text-2xl font-bold">SYSTEM INITIALIZED</h1>
        <p className="text-slate-500">Awaiting Dashboard and Sidebar integration...</p>
      </div>
    </div>
  );
}

export default App;