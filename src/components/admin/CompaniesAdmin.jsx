// src/components/admin/CompaniesAdmin.jsx
import { useState, useEffect } from 'react';
import { Building2, Trash2, ChevronDown, ChevronUp, Loader2,
         Menu, Save, X, AlertTriangle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { apiFetch } from '../../lib/apiFetch';

const STATUS_COLORS = {
  ACTIVE:    { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  INACTIVE:  { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-700'      },
  SUSPENDED: { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20'     },
};

// ── Modal confirmación de eliminación ─────────────────────────────────────────
const ConfirmDeleteModal = ({ company, onConfirm, onCancel, deleting }) => (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-900 border border-red-500/30 rounded-sm w-full max-w-md p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-sm bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle size={16} className="text-red-400" />
        </div>
        <h2 className="text-sm font-bold text-slate-200">Eliminar empresa</h2>
      </div>
      <p className="text-sm text-slate-400 mb-2">
        Esta acción eliminará permanentemente <span className="text-white font-bold">{company.name}</span> y todos sus datos:
      </p>
      <ul className="text-xs text-slate-500 space-y-1 mb-6 pl-4 list-disc">
        <li>Usuarios y credenciales</li>
        <li>Agentes configurados</li>
        <li>Historial de conversaciones y mensajes</li>
      </ul>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          disabled={deleting}
          className="text-xs text-slate-400 hover:text-white px-4 py-2 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-sm transition-colors"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
        </button>
      </div>
    </motion.div>
  </div>
);

// ── Company Card ───────────────────────────────────────────────────────────────
const CompanyCard = ({ company, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [form,     setForm]     = useState({
    name:                company.name,
    subscription_status: company.subscription_status || 'ACTIVE',
    business_context:    company.business_context || '',
  });
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  const dirty = form.name !== company.name ||
    form.subscription_status !== company.subscription_status ||
    form.business_context !== (company.business_context || '');

  const statusColors = STATUS_COLORS[company.subscription_status] || STATUS_COLORS.INACTIVE;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(company.id, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(company.id);
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <>
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
          <div className="w-9 h-9 rounded-sm bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
            <Building2 size={15} className="text-slate-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-200">{company.name}</p>
            <p className="text-[10px] text-slate-500 font-mono">
              ID: {company.id} · {new Date(company.created_at).toLocaleDateString('es-CL')}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm border', statusColors.bg, statusColors.text, statusColors.border)}>
              {company.subscription_status || 'ACTIVE'}
            </span>
            {saved && <Check size={14} className="text-emerald-500" />}
            {dirty && !saved && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                      Nombre de la empresa
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-600 outline-none rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                      Estado de suscripción
                    </label>
                    <select
                      value={form.subscription_status}
                      onChange={e => setForm(f => ({ ...f, subscription_status: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-600 outline-none rounded-sm"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                    Contexto del negocio
                  </label>
                  <textarea
                    value={form.business_context}
                    onChange={e => setForm(f => ({ ...f, business_context: e.target.value }))}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-slate-300 focus:border-blue-600 outline-none resize-y font-mono placeholder:text-slate-700 rounded-sm"
                  />
                </div>

                {/* ERP Mapping (solo lectura) */}
                {company.erp_mapping && (
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">
                      ERP Mapping (solo lectura)
                    </label>
                    <pre className="bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-slate-500 font-mono rounded-sm overflow-x-auto">
                      {JSON.stringify(company.erp_mapping, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                    Eliminar empresa
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

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDeleteModal
            company={company}
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ── Vista principal ────────────────────────────────────────────────────────────
export const CompaniesAdmin = ({ onMenuClick }) => {
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    apiFetch('/api/admin/companies')
      .then(r => r.json())
      .then(d => { if (d.success) setCompanies(d.companies); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (id, updates) => {
    const res  = await apiFetch(`/api/admin/companies/${id}`, {
      method: 'PUT', body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.success) {
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }
  };

  const handleDelete = async (id) => {
    const res = await apiFetch(`/api/admin/companies/${id}`, { method: 'DELETE' });
    if (res.ok) setCompanies(prev => prev.filter(c => c.id !== id));
  };

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    String(c.id).includes(search)
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 min-h-screen">
      <header className="h-16 px-4 border-b border-slate-800/50 flex items-center lg:hidden bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-400 hover:text-white">
          <Menu size={20} />
        </button>
        <span className="ml-3 font-mono font-bold text-sm text-white">Empresas</span>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Gestión de empresas</h1>
          <p className="text-slate-500 text-xs">{companies.length} empresa{companies.length !== 1 ? 's' : ''} registrada{companies.length !== 1 ? 's' : ''}.</p>
        </div>

        {/* Buscador */}
        {companies.length > 4 && (
          <div className="mb-5">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o ID..."
              className="w-full bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-600 outline-none rounded-sm placeholder:text-slate-600"
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-mono">Cargando empresas...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-slate-600 text-sm text-center py-16 border border-slate-800 rounded-sm">
            {search ? 'Sin resultados para esa búsqueda.' : 'Sin empresas registradas.'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {filtered.map(company => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
