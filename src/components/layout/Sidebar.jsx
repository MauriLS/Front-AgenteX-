import { useState, useEffect } from 'react';
import { LayoutDashboard, Warehouse, TrendingUp, BarChart3, Settings, LogOut, Shield, ChevronRight, Bot } from 'lucide-react';
import { cn } from '../../lib/utils';

// Diccionario visual: Mapea el template_id de Supabase con un icono de Lucide
const iconMap = {
  bodega: Warehouse,
  ventas: TrendingUp,
  analitica: BarChart3,
  // Fallback: Si creas un agente nuevo en el futuro y olvidas ponerle icono, usará este robot por defecto
  default: Bot 
};

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
  const [dynamicAgents, setDynamicAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // El cerebro B2B: Busca los agentes autorizados al cargar el menú
  useEffect(() => {
    const fetchMyAgents = async () => {
      try {
        const token = localStorage.getItem('token'); 
        
        // Cuidado aquí: Usa la variable de entorno que corresponda a tu proyecto (Vite)
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/agents/my-agents`; 
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setDynamicAgents(data.agents);
          }
        } else if (response.status === 401) {
            console.error("Token expirado o inválido. Debes redirigir al login.");
            // Aquí podrías agregar una redirección o limpiar el localStorage
        }
      } catch (error) {
        console.error("Falla de red al descubrir agentes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyAgents();
  }, []); // El array vacío asegura que esto solo se ejecute una vez al montar el componente

  // Opciones base que siempre deben existir independientemente de los permisos
  const baseItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Control Center' }
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
          {/* 1. Dibujamos el Control Center siempre */}
          {baseItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => {
                onNavigate(item.id);
                if(window.innerWidth < 1024) onClose(); // Cierra en mobile
              }}
              collapsed={collapsed}
            />
          ))}

          {/* 2. Sección Dinámica: Los agentes pagados */}
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
            dynamicAgents.map((agent) => {
              // Asignamos el icono basado en el templateId, o usamos el fallback
              const IconComponent = iconMap[agent.templateId] || iconMap.default;
              
              return (
                <NavItem
                  key={agent.instanceId} // Usamos el ID de la instancia de BD
                  icon={IconComponent}
                  label={agent.name}
                  active={activeTab === agent.templateId} // Seguimos usando templateId para la lógica de React
                  onClick={() => {
                    onNavigate(agent.templateId);
                    if(window.innerWidth < 1024) onClose(); // Cierra en mobile
                  }}
                  collapsed={collapsed}
                />
              );
            })
          )}
        </nav>

        {/* Footer Nav */}
        <div className="p-2 space-y-1 border-t border-slate-800/50">
          <NavItem 
            icon={Settings} 
            label="Configuración" 
            collapsed={collapsed} 
            active={activeTab === 'settings'}
            onClick={() => {
              onNavigate('settings');
              if(window.innerWidth < 1024) onClose();
            }}
          />
          {/* El botón de Logout debería tener lógica, no solo un onClick vacío */}
          <NavItem 
            icon={LogOut} 
            label="Terminate Session" 
            collapsed={collapsed} 
            onClick={() => {
                // Aquí va tu lógica real de cierre de sesión
                localStorage.removeItem('token');
                window.location.href = '/login'; // O usar useNavigate de react-router
            }}
          />
          
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