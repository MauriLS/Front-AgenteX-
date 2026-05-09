import { useState } from 'react';
import { Shield, ArrowRight, Lock, User, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      // 🚩 ASEGÚRATE de que esta ruta sea la correcta en tu Node.js
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Verifica si tu backend espera 'email' o 'username'
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // INYECCIÓN DE MEMORIA: Guardamos la credencial en el navegador
        localStorage.setItem('token', data.token);
        // Opcional: guardar datos del usuario si tu API los devuelve
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

        onLogin(); // Le avisamos al Orquestador (App.jsx) que abra las puertas
      } else {
        setErrorMsg(data.error || "Credenciales inválidas. Acceso denegado.");
      }
    } catch (error) {
      console.error("Fallo de red en login:", error);
      setErrorMsg("Fallo crítico de red. El servidor de autenticación no responde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden font-sans">
      {/* Abstract Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[60%] -right-[5%] w-[30%] h-[30%] bg-emerald-500/5 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-sm mb-6 shadow-2xl shadow-blue-600/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-mono font-bold tracking-tighter mb-2 text-white">
            AGENTE<span className="text-blue-600">X</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-tight">Enterprise Operations Control</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-sm shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-600/50 to-transparent" />
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-sm text-red-500 text-xs font-mono text-center animate-pulse">
              [!] {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2 block">Identity Provider</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="u-id@enterprise.x"
                  className="w-full bg-slate-950 border border-slate-800 px-10 py-3 text-sm text-white focus:outline-none focus:border-blue-600 transition-colors placeholder:text-slate-700"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2 block">Encryption Key</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 px-10 py-3 text-sm text-white focus:outline-none focus:border-blue-600 transition-colors placeholder:text-slate-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-sm transition-all flex items-center justify-center gap-2 group mt-4"
            >
              INITIALIZE SYSTEM
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/50 flex items-center justify-center gap-4">
            <button className="text-slate-500 hover:text-slate-300 transition-colors">
              <Globe size={18} />
            </button>
            <div className="h-4 w-[1px] bg-slate-800" />
            <span className="text-[10px] font-mono text-slate-600">v2.4.0-CORE</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};