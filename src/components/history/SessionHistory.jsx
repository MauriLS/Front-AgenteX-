// src/components/history/SessionHistory.jsx
import { useState, useEffect } from 'react';
import { MessageSquare, Trash2, ChevronRight, Loader2, Menu,
         Warehouse, TrendingUp, BarChart3, Bot, Package, LineChart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { apiFetch } from '../../lib/apiFetch';

const iconMap = {
  bodega:    Warehouse,
  ventas:    TrendingUp,
  analitica: BarChart3,
  logistica: Package,
  default:   Bot,
};

const colorMap = {
  bodega:    'text-amber-500',
  ventas:    'text-blue-500',
  analitica: 'text-emerald-500',
  logistica: 'text-purple-500',
  default:   'text-slate-400',
};

const formatDate = (iso) => {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);

  if (d.toDateString() === hoy.toDateString())
    return `Hoy ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
  if (d.toDateString() === ayer.toDateString())
    return `Ayer ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const SessionHistory = ({ onMenuClick, onSelectSession }) => {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    apiFetch('/api/sessions')
      .then(r => r.json())
      .then(d => { if (d.success) setSessions(d.sessions); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      const res = await apiFetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 min-h-screen">
      <header className="h-16 px-4 border-b border-slate-800/50 flex items-center lg:hidden bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-400 hover:text-white">
          <Menu size={20} />
        </button>
        <span className="ml-3 font-mono font-bold text-sm text-white">Historial</span>
      </header>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Historial de conversaciones</h1>
          <p className="text-slate-500 text-xs">Últimas 50 sesiones registradas.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-mono">Cargando sesiones...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-slate-600 text-sm text-center py-16 border border-slate-800 rounded-sm">
            Sin conversaciones registradas aún.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {sessions.map((session, i) => {
                const templateId  = session.company_agents?.agent_template_id || 'default';
                const Icon        = iconMap[templateId] || iconMap.default;
                const iconColor   = colorMap[templateId] || colorMap.default;
                const isDeleting  = deleting === session.id;

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => onSelectSession(session.id)}
                    className="bg-slate-900/50 border border-slate-800 p-4 rounded-sm flex items-center gap-4 cursor-pointer hover:border-slate-700 hover:bg-slate-900 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-sm bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className={iconColor} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate capitalize">
                        {templateId} · sesión #{session.id}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(session.created_at)}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => handleDelete(e, session.id)}
                        disabled={isDeleting}
                        className="p-1.5 text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Eliminar sesión"
                      >
                        {isDeleting
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                      <ChevronRight size={15} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
