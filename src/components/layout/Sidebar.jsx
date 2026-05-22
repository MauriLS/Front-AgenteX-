// src/components/layout/Sidebar.jsx
import { useState, useEffect } from 'react';
import { LayoutDashboard, Warehouse, TrendingUp, BarChart3, Settings,
         LogOut, Shield, ChevronRight, Bot, History, Package, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';

const iconMap = {
  bodega:    Warehouse,
  ventas:    TrendingUp,
  analitica: BarChart3,
  logistica: Package,
  default:   Bot,
};

const NavItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group relative',
      active
        ? 'bg-blue-600/10 text-blue-500 border-r-2 border-blue-600'
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
    )}
  >
    <Icon className={cn('w-5 h-5 flex-shrink-0', active ? 'text-blue-500' : 'group-hover:text-slate-100')} />
    {!collapsed && <span className="text-sm font-medium tracking-tight whitespace-nowrap">{label}</span>}
    {collapsed && active && (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-600 rounded-l-full" />
    )}
  </button>
);

export const Sidebar = ({ activeTab, onNavigate, isOpen, onClose }) => {
  const [collapsed,     setCollapsed]     = useState(false);
  const [dynamicAgents, setDynamicAgents] = useState([]);
  const [isLoading,     setIsLoading]     = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const user    = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetch(`${API_URL}/api/agents/my-agents`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(d => { if (d.success) setDynamicAgents(d.agents); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const navigate = (id) => { onNavigate(id); if (window.innerWidth < 1024) onClose(); };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-[70] lg:relative lg:flex flex-col bg-slate-950 border-r border-slate-800/50 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Brand */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800/50 mb-4">
          <div className="w-8 h-8 bg-blue-600 flex items-center justify-center rounded-sm flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="ml-3 font-mono font-bold text-lg tracking-tighter text-white overflow-hidden">
              AGENTE<span className="text-blue-600">X</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          <NavItem icon={LayoutDashboard} label="Control Center" active={activeTab === 'dashboard'}  onClick={() => navigate('dashboard')}  collapsed={collapsed} />
          <NavItem icon={History}         label="Historial"       active={activeTab === 'history'}    onClick={() => navigate('history')}    collapsed={collapsed} />

          {!collapsed && (
            <div className="px-3 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tus Agentes
            </div>
          )}

          {isLoading ? (
            <div className="px-4 py-2 text-xs text-slate-500">Cargando módulos...</div>
          ) : dynamicAgents.length === 0 ? (
            <div className="px-4 py-2 text-xs text-slate-500 italic">Sin agentes activos</div>
          ) : (
            dynamicAgents.map(agent => {
              const IconComponent = iconMap[agent.templateId] || iconMap.default;
              return (
                <NavItem
                  key={agent.instanceId}
                  icon={IconComponent}
                  label={agent.name}
                  active={activeTab === agent.templateId}
                  onClick={() => navigate(agent.templateId)}
                  collapsed={collapsed}
                />
              );
            })
          )}
        </nav>

        {/* Sección ADMIN — Gestión de agentes propia */}
        {user?.role === 'ADMIN' && (
          <>
            {!collapsed && (
              <div className="px-3 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Administración
              </div>
            )}
            <NavItem
              icon={Bot}
              label="Gestión de Agentes"
              active={activeTab === 'agents'}
              onClick={() => navigate('agents')}
              collapsed={collapsed}
            />
          </>
        )}

        {/* Sección SUPER_ADMIN — aprovisionar + empresas */}
        {user?.role === 'SUPER_ADMIN' && (
          <>
            {!collapsed && (
              <div className="px-3 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Super Admin
              </div>
            )}
            <NavItem
              icon={Shield}
              label="Aprovisionar Empresa"
              active={activeTab === 'provisioning'}
              onClick={() => navigate('provisioning')}
              collapsed={collapsed}
            />
            <NavItem
              icon={Globe}
              label="Empresas"
              active={activeTab === 'companies'}
              onClick={() => navigate('companies')}
              collapsed={collapsed}
            />
          </>
        )}

        {/* Footer */}
        <div className="p-2 space-y-1 border-t border-slate-800/50">
          <NavItem
            icon={Settings}
            label="Configuración"
            active={activeTab === 'settings'}
            onClick={() => navigate('settings')}
            collapsed={collapsed}
          />
          <NavItem
            icon={LogOut}
            label="Cerrar sesión"
            collapsed={collapsed}
            onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }}
          />
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center h-10 mt-2 hover:bg-white/5 transition-colors text-slate-500 hover:text-slate-100"
          >
            <ChevronRight className={cn('w-4 h-4 transition-transform', collapsed ? '' : 'rotate-180')} />
          </button>
        </div>
      </aside>
    </>
  );
};
