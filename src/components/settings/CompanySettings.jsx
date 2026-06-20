// src/components/settings/CompanySettings.jsx
import { useState, useEffect, useCallback } from 'react';
import { Building2, Save, Loader2, CheckCircle, Menu, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { ERPMappingSection } from '../provisioning/ERPMappingSection';
import { cn } from '../../lib/utils';
import { apiFetch } from '../../lib/apiFetch';

export const CompanySettings = ({ onMenuClick }) => {
  const [company,  setCompany]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');

  // Campos editables
  const [name,            setName]            = useState('');
  const [businessContext, setBusinessContext] = useState('');
  const [erpMapping,      setErpMapping]      = useState(null);

  useEffect(() => {
    apiFetch('/api/company')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCompany(d.company);
          setName(d.company.name || '');
          setBusinessContext(d.company.business_context || '');
          setErpMapping(d.company.erp_mapping || null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const onMappingChange = useCallback((mapping) => setErpMapping(mapping), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const body = {};
    if (name !== company?.name)                       body.name             = name;
    if (businessContext !== company?.business_context) body.business_context = businessContext;
    if (erpMapping !== company?.erp_mapping)           body.erp_mapping      = erpMapping;

    if (!Object.keys(body).length) return;

    setSaving(true);
    try {
      const res  = await apiFetch('/api/company', {
        method: 'PATCH', body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar.');
      setCompany(data.company);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 min-h-screen">
      <header className="h-16 px-4 border-b border-slate-800/50 flex items-center lg:hidden bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-400 hover:text-white">
          <Menu size={20} />
        </button>
        <span className="ml-3 font-mono font-bold text-sm text-white">Empresa</span>
      </header>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} className="text-blue-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Configuración de empresa</h1>
          </div>
          <p className="text-slate-500 text-xs">
            Actualiza el nombre, contexto del negocio y mapeo de campos del ERP.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-mono">Cargando configuración...</span>
          </div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
          >
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm text-red-400 text-xs font-mono">
                [!] {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-sm text-emerald-400 text-xs font-mono flex items-center gap-2">
                <CheckCircle size={13} /> Configuración guardada correctamente.
              </div>
            )}

            {/* Nombre de la empresa */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-sm p-5">
              <h2 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4">
                Identidad
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                    Razón social
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-600 outline-none rounded-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                    Estado suscripción
                  </label>
                  <div className={cn(
                    'px-3 py-2.5 text-sm rounded-sm border font-mono',
                    company?.subscription_status === 'ACTIVE'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  )}>
                    {company?.subscription_status || 'ACTIVE'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contexto del negocio */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-sm overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                onClick={e => e.currentTarget.nextElementSibling.classList.toggle('hidden')}
              >
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    Contexto del negocio
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Jerga del rubro, sinónimos y reglas de interpretación para los agentes
                  </p>
                </div>
                <RefreshCw size={14} className="text-slate-600 flex-shrink-0" />
              </button>
              <div className="border-t border-slate-800 px-5 py-4">
                <textarea
                  value={businessContext}
                  onChange={e => setBusinessContext(e.target.value)}
                  rows={8}
                  placeholder="## Jerga del rubro&#10;- 'goma' = neumático&#10;- números como 29, 26 son diámetros de rueda"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-slate-300 focus:border-blue-600 outline-none resize-y font-mono placeholder:text-slate-700 rounded-sm"
                />
              </div>
            </div>

            {/* ERP Mapping */}
            <ERPMappingSection onChange={onMappingChange} />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-sm transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </div>
  );
};
