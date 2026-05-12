import { useState } from 'react';
import { Shield, Loader2, Plus, Trash2, Server } from 'lucide-react';
import { motion } from 'motion/react';

export const RegisterB2B = () => {
  // 1. Estado Base de la Empresa
  const [formData, setFormData] = useState({
    company_name: '',
    erp_url: '',
    username: '',
    email: '',
    password: '',
  });

  // 2. Estado Dinámico del Array de Agentes
  const [agents, setAgents] = useState([
    { template_id: 'bodega', temperature: 0.3, custom_instructions: 'Eres un asistente estricto. Responde solo con datos del ERP.' }
  ]);

  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

  // Manejadores de Estado
  const handleBaseChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAgentChange = (index, field, value) => {
    const newAgents = [...agents];
    newAgents[index][field] = value;
    setAgents(newAgents);
  };

  const addAgent = () => {
    setAgents([...agents, { template_id: 'ventas', temperature: 0.5, custom_instructions: '' }]);
  };

  const removeAgent = (index) => {
    if (agents.length === 1) return; // Obligamos a que haya al menos un agente
    const newAgents = agents.filter((_, i) => i !== index);
    setAgents(newAgents);
  };

  // 3. El Disparador Transaccional
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    // Construimos el Payload exacto que espera Node.js
    const payload = {
      ...formData,
      agents_to_provision: agents
    };

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Brecha de seguridad: Token de administrador no encontrado.");

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Fallo crítico en el despliegue.');

      setStatus({ loading: false, error: '', success: `✅ ${data.message} ID de despliegue generado.` });
      
      // Limpiamos el formulario tras el éxito
      setFormData({ company_name: '', erp_url: '', username: '', email: '', password: '' });
      setAgents([{ template_id: 'bodega', temperature: 0.3, custom_instructions: '' }]);

    } catch (err) {
      setStatus({ loading: false, error: err.message, success: '' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-950 text-white font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Cabecera del Panel */}
        <div className="mb-8 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <Server className="w-6 h-6" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Despliegue de Infraestructura B2B</h1>
          </div>
          <p className="text-slate-400 text-sm">Aprovisionamiento manual de inquilinos y asignación de flotas de IA.</p>
        </div>

        {status.error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-sm text-red-400 text-sm font-mono flex items-center gap-2">
            <span>[!]</span> {status.error}
          </div>
        )}

        {status.success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-sm text-emerald-400 text-sm font-mono flex items-center gap-2">
            {status.success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECCIÓN 1: Datos del Tenant */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-sm">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" /> Identidad Corporativa
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Razón Social / Empresa *</label>
                <input type="text" name="company_name" required value={formData.company_name} onChange={handleBaseChange} 
                       className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-600 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">URL Base ERP (Opcional)</label>
                <input type="url" name="erp_url" value={formData.erp_url} onChange={handleBaseChange} placeholder="https://api.empresa.com"
                       className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-600 outline-none placeholder:text-slate-700" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nombre de Admin *</label>
                <input type="text" name="username" required value={formData.username} onChange={handleBaseChange} 
                       className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-600 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Correo de Acceso *</label>
                <input type="email" name="email" required value={formData.email} onChange={handleBaseChange} 
                       className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-600 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Contraseña Temporal *</label>
                <input type="password" name="password" required value={formData.password} onChange={handleBaseChange} 
                       className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-600 outline-none" />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Flota de Agentes */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" /> Configuración de Agentes
              </h2>
              <button type="button" onClick={addAgent} className="text-xs flex items-center gap-1 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-sm transition-colors border border-blue-600/50">
                <Plus className="w-3 h-3" /> Añadir Módulo
              </button>
            </div>

            <div className="space-y-4">
              {agents.map((agent, index) => (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  key={index} 
                  className="p-4 bg-slate-950 border border-slate-800 relative group"
                >
                  <div className="absolute -left-[1px] top-0 w-[2px] h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {agents.length > 1 && (
                    <button type="button" onClick={() => removeAgent(index)} className="absolute right-3 top-3 text-slate-600 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="text-xs text-slate-500 mb-1 block">Módulo (Template ID)</label>
                      <select 
                        value={agent.template_id} 
                        onChange={(e) => handleAgentChange(index, 'template_id', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:border-blue-600 outline-none"
                      >
                        <option value="bodega">Bodega (Inventario)</option>
                        <option value="ventas">Ventas (Comercial)</option>
                        <option value="analitica">Analítica (Datos)</option>
                      </select>

                      <label className="text-xs text-slate-500 mb-1 block mt-4">Temperatura ({agent.temperature})</label>
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
                      <label className="text-xs text-slate-500 mb-1 block">System Prompt (Instrucciones base)</label>
                      <textarea 
                        required
                        value={agent.custom_instructions}
                        onChange={(e) => handleAgentChange(index, 'custom_instructions', e.target.value)}
                        placeholder="Define el comportamiento exacto, restricciones y tono de este agente..."
                        className="w-full bg-slate-900 border border-slate-800 px-4 py-3 text-sm text-slate-300 focus:border-blue-600 outline-none min-h-[120px] resize-y placeholder:text-slate-700 font-mono"
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
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-sm transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {status.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'EJECUTAR DESPLIEGUE EN PRODUCCIÓN'}
          </button>
        </form>
      </div>
    </div>
  );
};