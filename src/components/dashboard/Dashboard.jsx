// src/components/dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Warehouse, TrendingUp, BarChart3, ArrowUpRight,
         Zap, Users, Menu, Bot, Loader2, MessageSquare, Cpu, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const iconMap   = { bodega: Warehouse, ventas: TrendingUp, analitica: BarChart3, default: Bot };
const colorMap  = {
  bodega:    { bg: 'bg-amber-500/10',   text: 'text-amber-500',   border: 'border-amber-500/20'   },
  ventas:    { bg: 'bg-blue-500/10',    text: 'text-blue-500',    border: 'border-blue-500/20'    },
  analitica: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  default:   { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-700'      },
};

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n ?? 0);

const StatCard = ({ label, value, icon: Icon, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="bg-slate-900/50 border border-slate-800 p-4 rounded-sm flex items-center gap-4"
  >
    <div className={cn('w-10 h-10 rounded-sm border flex items-center justify-center flex-shrink-0', color.bg, color.border)}>
      <Icon size={16} className={color.text} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest truncate">{label}</p>
      <p className="text-xl font-mono font-bold text-slate-200">{value}</p>
    </div>
  </motion.div>
);

const AgentCard = ({ stat, onNavigate, delay = 0 }) => {
  const Icon   = iconMap[stat.agent_id]  || iconMap.default;
  const colors = colorMap[stat.agent_id] || colorMap.default;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      whileHover={{ y: -3 }}
      onClick={() => onNavigate(stat.agent_id)}
      className="bg-slate-900/50 border border-slate-800 p-5 rounded-sm cursor-pointer group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/5 -rotate-45 translate-x-10 -translate-y-10 group-hover:bg-blue-600/10 transition-colors" />
      <div className="flex items-start justify-between mb-5">
        <div className={cn('w-10 h-10 rounded-sm border flex items-center justify-center', colors.bg, colors.border)}>
          <Icon size={18} className={colors.text} />
        </div>
        <ArrowUpRight size={15} className="text-slate-600 group-hover:text-slate-300 transition-colors" />
      </div>
      <p className="text-sm font-bold text-slate-100 mb-4">{stat.agent_name}</p>
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800">
        {[
          { label: 'Sesiones',  value: stat.total_sesiones  },
          { label: 'Preguntas', value: stat.total_preguntas },
          { label: 'Tokens',    value: fmt(stat.total_tokens) },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[9px] uppercase text-slate-500 tracking-widest mb-0.5">{label}</p>
            <p className="text-sm font-mono font-bold text-slate-300">{value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export const Dashboard = ({ onMenuClick, onNavigate }) => {
  const [stats,   setStats]   = useState([]);
  const [agents,  setAgents]  = useState([]);
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    Promise.all([
      fetch(`${API_URL}/api/sessions/stats`,   { headers }).then(r => r.json()),
      fetch(`${API_URL}/api/agents/my-agents`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/api/users/me`,          { headers }).then(r => r.json()),
    ]).then(([s, a, u]) => {
      if (s.success) setStats(s.stats);
      if (a.success) setAgents(a.agents);
      if (u.success) setUser(u.user);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalSesiones  = stats.reduce((s, a) => s + a.total_sesiones,  0);
  const totalPreguntas = stats.reduce((s, a) => s + a.total_preguntas, 0);
  const totalTokens    = stats.reduce((s, a) => s + a.total_tokens,    0);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 min-h-screen">
      <header className="h-16 px-4 border-b border-slate-800/50 flex items-center lg:hidden bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-400 hover:text-white">
          <Menu size={20} />
        </button>
        <div className="ml-3 font-mono font-bold text-sm tracking-tighter text-white">
          AGENTE<span className="text-blue-600">X</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Zap size={13} className="fill-current" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">
              {loading ? 'Cargando...' : `${agents.length} agente${agents.length !== 1 ? 's' : ''} activo${agents.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
            {user ? `Bienvenido, ${user.username}` : 'Command Overview'}
          </h1>
          <p className="text-slate-500 text-xs">
            {user?.role === 'ADMIN' ? 'Administrador · ' : ''}
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-mono">Cargando métricas...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <StatCard label="Agentes activos"  value={agents.length}    icon={Activity}      color={colorMap.ventas}    delay={0}    />
              <StatCard label="Sesiones"          value={totalSesiones}    icon={Users}         color={colorMap.analitica} delay={0.05} />
              <StatCard label="Preguntas"         value={totalPreguntas}   icon={MessageSquare} color={colorMap.bodega}    delay={0.1}  />
              <StatCard label="Tokens usados"     value={fmt(totalTokens)} icon={Cpu}           color={colorMap.default}   delay={0.15} />
            </div>

            <div>
              <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-5">Tus agentes</h2>
              {stats.length === 0 ? (
                <div className="text-slate-600 text-sm text-center py-12 border border-slate-800 rounded-sm">
                  Sin actividad registrada. Inicia una conversación con algún agente.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {stats.map((stat, i) => (
                    <AgentCard key={stat.agent_id} stat={stat} onNavigate={onNavigate} delay={0.1 + i * 0.05} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
