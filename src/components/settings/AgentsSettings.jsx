// src/components/settings/AgentsSettings.jsx
import { useState, useEffect } from 'react';
import { Plus, Save, Power, Loader2, Menu, ChevronDown, ChevronUp,
         Warehouse, TrendingUp, BarChart3, Bot, Package, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const iconMap  = { bodega: Warehouse, ventas: TrendingUp, analitica: BarChart3, logistica: Package, default: Bot };
const colorMap = {
  bodega:    { bg: 'bg-amber-500/10',   text: 'text-amber-500',   border: 'border-amber-500/20'   },
  ventas:    { bg: 'bg-blue-500/10',    text: 'text-blue-500',    border: 'border-blue-500/20'    },
  analitica: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  logistica: { bg: 'bg-purple-500/10',  text: 'text-purple-500',  border: 'border-purple-500/20'  },
  default:   { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-700'      },
};

// ── Agent Card ─────────────────────────────────────────────────────────────────
const AgentCard = ({ agent, onSave, onDeactivate }) => {
  const templateId = agent.agent_template_id;
  const Icon       = iconMap[templateId]  || iconMap.default;
  const colors     = colorMap[templateId] || colorMap.default;

  const [expanded,     setExpanded]     = useState(false);
  const [instructions, setInstructions] = useState(agent.custom_instructions || '');
  const [temperature,  setTemperature]  = useState(agent.temperature ?? 0.3);
  const [saving,       setSaving]       = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [saved,        setSaved]        = useState(false);

  const dirty = instructions !== agent.custom_instructions || temperature !== agent.temperature;

  const handleSave = async () => {
    setSaving(true);
    await onSave(agent.id, { custom_instructions: instructions, temperature });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    await onDeactivate(agent.id);
    setDeactivating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-900/50 border border-slate-800 rounded-sm overflow-hidden"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-900 transition-colors"
      >
        <div className={cn('w-9 h-9 rounded-sm border flex items-center justify-center flex-shrink-0', colors.bg, colors.border)}>
          <Icon size={16} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-200">{agent.agent_templates?.name || templateId}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            Motor: {agent.agent_templates?.motor || '—'} · Temp: {temperature}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {saved && <Check size={14} className="text-emerald-500" />}
          {dirty && !saved && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Cambios sin guardar" />}
          {expanded ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
        </div>
      </button>

      {/* Edición */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-800 px-5 py-5 flex flex-col gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                  Instrucciones del agente
                </label>
                <textarea
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-slate-300 focus:border-blue-600 outline-none resize-y font-mono placeholder:text-slate-700 rounded-sm"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                  Temperatura ({temperature})
                </label>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>Preciso (0.0)</span>
                  <span>Creativo (1.0)</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={deactivating}
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  {deactivating
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Power size={13} />
                  }
                  Desactivar agente
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-sm transition-colors"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Modal: nuevo agente ────────────────────────────────────────────────────────
const NuevoAgenteModal = ({ templates, agentesActivos, onClose, onCreated }) => {
  const [form, setForm] = useState({
    agent_template_id:   '',
    custom_instructions: '',
    temperature:         0.3,
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const API_URL  = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const headers  = { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };

  // Filtrar templates que ya están activos
  const activosIds   = agentesActivos.map(a => a.agent_template_id);
  const disponibles  = templates.filter(t => !activosIds.includes(t.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.agent_template_id) { setError('Selecciona un tipo de agente.'); return; }
    if (!form.custom_instructions.trim()) { setError('Las instrucciones son obligatorias.'); return; }

    setSaving(true);
    try {
      const res  = await fetch(`${API_URL}/api/agents`, { method: 'POST', headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear el agente.');
      onCreated(data.agent);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-sm w-full max-w-lg"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-200">Añadir agente</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm text-red-400 text-xs font-mono">
              [!] {error}
            </div>
          )}

          {disponibles.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              Todos los templates disponibles ya están activos en tu empresa.
            </p>
          ) : (
            <>
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                  Tipo de agente
                </label>
                <select
                  value={form.agent_template_id}
                  onChange={e => setForm(f => ({ ...f, agent_template_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-600 outline-none rounded-sm"
                >
                  <option value="">Seleccionar...</option>
                  {disponibles.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} — motor: {t.motor}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                  Instrucciones del agente
                </label>
                <textarea
                  value={form.custom_instructions}
                  onChange={e => setForm(f => ({ ...f, custom_instructions: e.target.value }))}
                  rows={5}
                  placeholder="Eres el asistente de [EMPRESA]. Tu tono es..."
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-slate-300 focus:border-blue-600 outline-none resize-y font-mono placeholder:text-slate-700 rounded-sm"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                  Temperatura ({form.temperature})
                </label>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={form.temperature}
                  onChange={e => setForm(f => ({ ...f, temperature: parseFloat(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>Preciso (0.0)</span>
                  <span>Creativo (1.0)</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-white px-4 py-2 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-sm transition-colors"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  {saving ? 'Creando...' : 'Crear agente'}
                </button>
              </div>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
};

// ── Vista principal ────────────────────────────────────────────────────────────
export const AgentsSettings = ({ onMenuClick }) => {
  const [agents,    setAgents]    = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/agents`,           { headers }).then(r => r.json()),
      fetch(`${API_URL}/api/agents/templates`, { headers }).then(r => r.json()),
    ]).then(([agentsRes, templatesRes]) => {
      if (agentsRes.success)   setAgents(agentsRes.agents.filter(a => a.is_active));
      if (templatesRes.success) setTemplates(templatesRes.templates);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (id, updates) => {
    const res  = await fetch(`${API_URL}/api/agents/${id}`, { method: 'PUT', headers, body: JSON.stringify(updates) });
    const data = await res.json();
    if (data.success) {
      setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    }
  };

  const handleDeactivate = async (id) => {
    const res = await fetch(`${API_URL}/api/agents/${id}`, { method: 'DELETE', headers });
    if (res.ok) setAgents(prev => prev.filter(a => a.id !== id));
  };

  const handleCreated = (newAgent) => {
    // Recargar agentes para obtener el join con agent_templates
    fetch(`${API_URL}/api/agents`, { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setAgents(d.agents.filter(a => a.is_active)); });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 min-h-screen">
      <header className="h-16 px-4 border-b border-slate-800/50 flex items-center lg:hidden bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-400 hover:text-white">
          <Menu size={20} />
        </button>
        <span className="ml-3 font-mono font-bold text-sm text-white">Agentes</span>
      </header>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Gestión de agentes</h1>
            <p className="text-slate-500 text-xs">Edita instrucciones, temperatura o desactiva agentes de tu empresa.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-sm transition-colors flex-shrink-0"
          >
            <Plus size={14} /> Añadir agente
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-mono">Cargando agentes...</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-slate-600 text-sm text-center py-16 border border-slate-800 rounded-sm">
            Sin agentes activos. Añade uno para comenzar.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onSave={handleSave}
                  onDeactivate={handleDeactivate}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <NuevoAgenteModal
            templates={templates}
            agentesActivos={agents}
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
