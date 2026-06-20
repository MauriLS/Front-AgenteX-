// src/components/settings/ProfileSettings.jsx
import { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, Loader2, CheckCircle, Menu } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { apiFetch } from '../../lib/apiFetch';

const Field = ({ label, icon: Icon, error, ...props }) => (
  <div>
    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5 block">{label}</label>
    <div className="relative">
      <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
      <input
        className={cn(
          'w-full bg-slate-950 border px-9 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-700',
          error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-600'
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

export const ProfileSettings = ({ onMenuClick }) => {
  const [form,    setForm]    = useState({ username: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    apiFetch('/api/users/me')
      .then(r => r.json())
      .then(data => {
        if (data.success) setForm(f => ({ ...f, username: data.user.username, email: data.user.email }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (form.password && form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    const body = {};
    if (form.username) body.username = form.username;
    if (form.email)    body.email    = form.email;
    if (form.password) body.password = form.password;

    setSaving(true);
    try {
      const res  = await apiFetch('/api/users/me', { method: 'PUT', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar.');
      setSuccess(true);
      setForm(f => ({ ...f, password: '', confirm: '' }));
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
        <span className="ml-3 font-mono font-bold text-sm text-white">Configuración</span>
      </header>

      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Perfil</h1>
          <p className="text-slate-500 text-xs">Actualiza tu nombre, email o contraseña de acceso.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-mono">Cargando perfil...</span>
          </div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="bg-slate-900/50 border border-slate-800 rounded-sm p-6 space-y-5"
          >
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm text-red-400 text-xs font-mono">
                [!] {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-sm text-emerald-400 text-xs font-mono flex items-center gap-2">
                <CheckCircle size={13} /> Cambios guardados correctamente.
              </div>
            )}

            <Field
              label="Nombre de usuario"
              icon={User}
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="tu_usuario"
            />
            <Field
              label="Email"
              icon={Mail}
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="tu@email.com"
            />

            <div className="border-t border-slate-800 pt-5">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4">
                Cambiar contraseña <span className="text-slate-600 normal-case font-normal">(opcional)</span>
              </p>
              <div className="space-y-4">
                <Field
                  label="Nueva contraseña"
                  icon={Lock}
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                />
                <Field
                  label="Confirmar contraseña"
                  icon={Lock}
                  type="password"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="••••••••"
                  error={form.password && form.confirm && form.password !== form.confirm ? 'No coinciden' : ''}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
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