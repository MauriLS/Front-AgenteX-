import { useState } from 'react';
import { LayoutDashboard, Warehouse, TrendingUp, BarChart3, Settings, LogOut, Shield, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const NavItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group relative",
      active 
        ? "bg-blue-600/10 text-blue-500 border-r-2 border-blue-600" 
        : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
    )}
  >
    <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-blue-500" : "group-hover:text-slate-100")} />
    {!collapsed && <span className="text-sm font-medium tracking-tight whitespace-nowrap">{label}</span>}
    {collapsed && active && (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-600 rounded-l-full" />
    )}
  </button>
);

export const Sidebar = ({ activeTab, onNavigate, isOpen, onClose }) => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Control Center' },
    { id: 'bodega', icon: Warehouse, label: 'Agente Bodega' },
    { id: 'ventas', icon: TrendingUp, label: 'Agente de Ventas' },
    { id: 'analitica', icon: BarChart3, label: 'Agente de Analítica' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[70] lg:relative lg:flex flex-col bg-slate-950 border-r border-slate-800/50 transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Brand */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800/50 mb-4">
          <div className="w-8 h-8 bg-blue-600 flex items-center justify-center rounded-sm flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="ml-3 font-mono font-bold text-lg tracking-tighter overflow-hidden text-white">
              AGENTE<span className="text-blue-600">X</span>
            </div>
          )}
        </div>

        {/* Primary Nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => onNavigate(item.id)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Footer Nav */}
        <div className="p-2 space-y-1 border-t border-slate-800/50">
          <NavItem 
            icon={Settings} 
            label="Configuración" 
            collapsed={collapsed} 
            active={activeTab === 'settings'}
            onClick={() => onNavigate('settings')}
          />
          <NavItem icon={LogOut} label="Terminate Session" collapsed={collapsed} />
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center h-10 mt-2 hover:bg-white/5 transition-colors text-slate-500 hover:text-slate-100"
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform", collapsed ? "" : "rotate-180")} />
          </button>
        </div>
      </aside>
    </>
  );
};