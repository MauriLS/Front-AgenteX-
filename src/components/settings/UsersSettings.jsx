// src/components/settings/UsersSettings.jsx
import { useState, useEffect } from 'react';
import { Users, Trash2, Loader2, Menu, Shield, User, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../../lib/apiFetch';
import { cn } from '../../lib/utils';

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', icon: Crown,  color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  ADMIN:       { label: 'Admin',       icon: Shield, color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  USER:        { label: 'Usuario',     icon: User,   color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-700'      },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

export const UsersSettings = ({ onMenuClick }) => {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState(null);
  const [error,     setError]     = useState('');
  const [currentId, setCurrentId] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/users').then(r => r.json()),
      apiFetch('/api/users/me').then(r => r.json()),
    ]).then(([usersRes, meRes]) => {
      if (usersRes.success) setUsers(usersRes.users);
      if (meRes.success)    setCurrentId(meRes.user.id);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    setDeleting(id);
    setError('');
    try {
      const res  = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar.');
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      setError(err.message);
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
        <span className="ml-3 font-mono font-bold text-sm text-white">Usuarios</span>
      </header>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-blue-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Gestión de usuarios</h1>
          </div>
          <p className="text-slate-500 text-xs">
            Usuarios registrados en tu empresa. No puedes eliminar tu propio usuario.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-sm text-red-400 text-xs font-mono">
            [!] {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-mono">Cargando usuarios...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-slate-600 text-sm text-center py-16 border border-slate-800 rounded-sm">
            Sin usuarios registrados.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {users.map((user, i) => {
                const roleConf  = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER;
                const RoleIcon  = roleConf.icon;
                const isMe      = user.id === currentId;
                const isDeleting = deleting === user.id;

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-slate-900/50 border border-slate-800 rounded-sm px-5 py-4 flex items-center gap-4"
                  >
                    {/* Avatar */}
                    <div className={cn(
                      'w-9 h-9 rounded-sm border flex items-center justify-center flex-shrink-0',
                      roleConf.bg, roleConf.border
                    )}>
                      <RoleIcon size={15} className={roleConf.color} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-200 truncate">
                          {user.username}
                        </p>
                        {isMe && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-sm">
                            Tú
                          </span>
                        )}
                        <span className={cn(
                          'text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border',
                          roleConf.bg, roleConf.color, roleConf.border
                        )}>
                          {roleConf.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {user.email} · Desde {formatDate(user.created_at)}
                      </p>
                    </div>

                    {/* Eliminar */}
                    {!isMe && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={!!deleting}
                        className="p-2 text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40 flex-shrink-0"
                        aria-label={`Eliminar ${user.username}`}
                      >
                        {isDeleting
                          ? <Loader2 size={15} className="animate-spin" />
                          : <Trash2 size={15} />
                        }
                      </button>
                    )}
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
