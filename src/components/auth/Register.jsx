import { useState, useCallback } from 'react';
import { ERPMappingSection } from '../provisioning/ERPMappingSection';
import { Shield, Loader2, Plus, Trash2, Server, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// =============================================================================
// TOOLTIPS DE AYUDA — explica cada campo técnico al admin
// =============================================================================
const Tooltip = ({ text }) => (
  <span className="group relative inline-block ml-1">
    <HelpCircle className="w-3 h-3 text-slate-600 hover:text-blue-500 cursor-help inline" />
    <span className="absolute z-50 hidden group-hover:block bg-slate-800 border border-slate-700 text-slate-300 text-xs p-2 rounded-sm w-64 -top-2 left-5 leading-relaxed shadow-xl">
      {text}
    </span>
  </span>
);

// =============================================================================
// ESTADO INICIAL
// =============================================================================
const AGENT_INICIAL = {
  template_id:         'bodega',
  temperature:         0.3,
  custom_instructions: '',
};

export const RegisterB2B = () => {

  // ── Datos base de la empresa ─────────────────────────────────────────────
  const [formData, setFormData] = useState({
    company_name:     '',
    erp_url:          '',
    business_context: '',
    username:         '',
    email:            '',
    password:         '',
  });

  // ── Mapeo de campos ERP — gestionado por ERPMappingSection ──────────────
  const [erpMapping, setErpMapping] = useState(null);
  const onMappingChange = useCallback((mapping) => setErpMapping(mapping), []);

  // ── Agentes a provisionar ────────────────────────────────────────────────
  const [agents, setAgents] = useState([AGENT_INICIAL]);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showContext,  setShowContext]  = useState(false);
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleBaseChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAgentChange = (index, field, value) => {
    const updated = [...agents];
    updated[index][field] = value;
    setAgents(updated);
  };

  const addAgent = () =>
    setAgents([...agents, { template_id: 'ventas', temperature: 0.5, custom_instructions: '' }]);

  const removeAgent = (index) => {
    if (agents.length === 1) return;
    setAgents(agents.filter((_, i) => i !== index));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🗺️ erpMapping:', JSON.stringify(erpMapping));

    // erpMapping viene de ERPMappingSection — ya está limpio y listo.
    // Si el admin no configuró el mapeo, llega null — lo pasamos tal cual.
    const payload = {
      ...formData,
      erp_mapping:         erpMapping || null,
      agents_to_provision: agents,
    };

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token de administrador no encontrado.');

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fallo en el despliegue.');

      setStatus({ loading: false, error: '', success: `✅ ${data.message}` });
      setFormData({ company_name: '', erp_url: '', business_context: '', username: '', email: '', password: '' });
      setErpMapping(null);
      setAgents([AGENT_INICIAL]);

    } catch (err) {
      setStatus({ loading: false, error: err.message, success: '' });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950 text-white font-sans">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <Server className="w-6 h-6" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Despliegue de Infraestructura B2B</h1>
          </div>
          <p className="text-slate-400 text-sm">Aprovisionamiento de tenants y asignación de agentes IA.</p>
        </div>

        {status.error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-sm text-red-400 text-sm font-mono">
            [!] {status.error}
          </div>
        )}
        {status.success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-sm text-emerald-400 text-sm font-mono">
            {status.success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── SECCIÓN 1: Identidad Corporativa ───────────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-sm">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" /> Identidad Corporativa
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Razón Social *</label>
                <input type="text" name="company_name" required value={formData.company_name}
                  onChange={handleBaseChange}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-600 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  URL Endpoint ERP Principal
                  <Tooltip text="URL del GET que devuelve el listado de productos/registros. Ej: https://api.empresa.com/articulos" />
                </label>
                <input type="url" name="erp_url" value={formData.erp_url}
                  onChange={handleBaseChange} placeholder="https://api.empresa.com/productos"
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-600 outline-none placeholder:text-slate-700" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nombre Admin *</label>
                <input type="text" name="username" required value={formData.username}
                  onChange={handleBaseChange}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-600 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Email Admin *</label>
                <input type="email" name="email" required value={formData.email}
                  onChange={handleBaseChange}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-600 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Contraseña Temporal *</label>
                <input type="password" name="password" required value={formData.password}
                  onChange={handleBaseChange}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-600 outline-none" />
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 2: Mapeo de Campos ERP — dinámico ──────────────────── */}
          <ERPMappingSection onChange={onMappingChange} />

          {/* ── SECCIÓN 3: Contexto del Negocio ────────────────────────────── */}
          {/* Por qué existe: el extractor de intención (LLM auxiliar) necesita  */}
          {/* entender la jerga del rubro para extraer términos correctamente.    */}
          {/* Sin esto, "goma" no se traduce a "neumatico" y la búsqueda falla.  */}
          <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowContext(!showContext)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" /> Contexto del Negocio
                  <Tooltip text="Diccionario del rubro: jerga, sinónimos, reglas de medidas. Ayuda al agente a entender cómo hablan tus usuarios." />
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {showContext ? 'Define la jerga y reglas de tu industria' : 'Recomendado — mejora significativamente la comprensión del agente'}
                </p>
              </div>
              {showContext ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            <AnimatePresence>
              {showContext && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 border-t border-slate-800">
                    <p className="text-xs text-slate-500 mt-4 mb-3 leading-relaxed">
                      Describe la jerga de tu industria, sinónimos de productos, reglas de medidas y términos coloquiales que usan tus usuarios.
                      Ejemplo: <em className="text-slate-400">"La palabra 'goma' significa neumático. Los números como 29, 26 son diámetros de rueda."</em>
                    </p>
                    <textarea
                      name="business_context"
                      value={formData.business_context}
                      onChange={handleBaseChange}
                      placeholder={`Ejemplos:\n- "goma" = neumático\n- Números como 29, 26 son diámetros de rueda\n- "caluga" = neumático con tacos para terreno\n- Medidas formato: 29x2.10, 26x1.75`}
                      className="w-full bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-300 focus:border-blue-600 outline-none min-h-[160px] resize-y placeholder:text-slate-700 font-mono leading-relaxed"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── SECCIÓN 4: Flota de Agentes ────────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" /> Agentes a Desplegar
              </h2>
              <button type="button" onClick={addAgent}
                className="text-xs flex items-center gap-1 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-sm transition-colors border border-blue-600/50">
                <Plus className="w-3 h-3" /> Añadir Agente
              </button>
            </div>

            <div className="space-y-4">
              {agents.map((agent, index) => (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  key={index}
                  className="p-4 bg-slate-950 border border-slate-800 relative group rounded-sm"
                >
                  <div className="absolute -left-[1px] top-0 w-[2px] h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-sm" />

                  {agents.length > 1 && (
                    <button type="button" onClick={() => removeAgent(index)}
                      className="absolute right-3 top-3 text-slate-600 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">
                        Módulo
                        <Tooltip text="Define qué tipo de agente es. Bodega busca productos, Analítica agrega métricas, Ventas gestiona pipeline comercial." />
                      </label>
                      <select
                        value={agent.template_id}
                        onChange={(e) => handleAgentChange(index, 'template_id', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:border-blue-600 outline-none mb-4"
                      >
                        <option value="bodega">Bodega (Inventario)</option>
                        <option value="ventas">Ventas (Comercial)</option>
                        <option value="analitica">Analítica (Datos)</option>
                      </select>

                      <label className="text-xs text-slate-500 mb-1 block">
                        Temperatura ({agent.temperature})
                        <Tooltip text="0.0 = muy preciso y literal. 1.0 = más creativo en la redacción. Para bodega recomendamos 0.2-0.3. Para ventas 0.5-0.7." />
                      </label>
                      <input
                        type="range" min="0" max="1" step="0.1"
                        value={agent.temperature}
                        onChange={(e) => handleAgentChange(index, 'temperature', parseFloat(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                        <span>Preciso (0.0)</span>
                        <span>Creativo (1.0)</span>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-500 mb-1 block">
                        Instrucciones del Agente *
                        <Tooltip text="Define la personalidad, tono y restricciones específicas de este agente para esta empresa. Se combina con las reglas globales del sistema." />
                      </label>
                      <textarea
                        required
                        value={agent.custom_instructions}
                        onChange={(e) => handleAgentChange(index, 'custom_instructions', e.target.value)}
                        placeholder={
                          agent.template_id === 'bodega'
                            ? 'Eres el operario de bodega de [EMPRESA]. Tono crudo y transaccional. Solo reportas datos del ERP, nunca inventas...'
                            : agent.template_id === 'analitica'
                            ? 'Eres el analista de datos de [EMPRESA]. Presentas métricas con contexto. Usas tablas para comparaciones...'
                            : 'Eres el agente comercial de [EMPRESA]. Tu objetivo es ayudar al equipo de ventas...'
                        }
                        className="w-full bg-slate-900 border border-slate-800 px-4 py-3 text-sm text-slate-300 focus:border-blue-600 outline-none min-h-[140px] resize-y placeholder:text-slate-700 font-mono"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={status.loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 px-4 rounded-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {status.loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> DESPLEGANDO...</>
              : 'EJECUTAR DESPLIEGUE EN PRODUCCIÓN'
            }
          </button>
        </form>
      </div>
    </div>
  );
};
