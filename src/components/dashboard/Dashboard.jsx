import { Shield, TrendingUp, Warehouse, BarChart3, ArrowUpRight, Zap, Target, Users, Menu } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const AGENTS = [
  {
    id: 'b-01',
    name: 'AGENTE BODEGA',
    description: 'Autonomous inventory tracking, storage optimization, and dispatch monitoring.',
    status: 'online',
    type: 'logistics',
    taskCount: 156
  },
  {
    id: 'v-02',
    name: 'AGENTE DE VENTAS',
    description: 'CRM conversion analysis, lead qualification and pipeline automation.',
    status: 'online',
    type: 'sales',
    taskCount: 204
  },
  {
    id: 'a-03',
    name: 'AGENTE DE ANALÍTICA',
    description: 'Real-time statistical processing and predictive business intelligence.',
    status: 'busy',
    type: 'financial',
    taskCount: 112
  }
];

const AgentCard = ({ agent }) => {
  const Icon = agent.type === 'financial' ? BarChart3 : agent.type === 'logistics' ? Warehouse : TrendingUp;

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-5 relative overflow-hidden group cursor-pointer rounded-sm"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 -rotate-45 translate-x-12 -translate-y-12 group-hover:bg-blue-600/10 transition-colors" />
      
      <div className="flex items-start justify-between mb-6">
        <div className={cn(
          "w-10 h-10 flex items-center justify-center rounded-sm",
          agent.type === 'financial' ? "bg-emerald-500/10 text-emerald-500" :
          agent.type === 'logistics' ? "bg-amber-500/10 text-amber-500" :
          "bg-blue-500/10 text-blue-500"
        )}>
          <Icon size={20} />
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-sm z-10">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            agent.status === 'online' ? "bg-emerald-500" : "bg-amber-500"
          )} />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{agent.status}</span>
        </div>
      </div>

      <h3 className="text-sm font-bold tracking-tight text-slate-100 mb-1 relative z-10">{agent.name}</h3>
      <p className="text-xs text-slate-400 leading-relaxed mb-6 h-8 line-clamp-2 relative z-10">{agent.description}</p>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800 relative z-10">
        <div>
          <div className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">Tasks Assigned</div>
          <div className="text-lg font-mono font-bold text-slate-200">{agent.taskCount}</div>
        </div>
        <button className="p-2 text-slate-500 hover:text-white transition-colors">
          <ArrowUpRight size={18} />
        </button>
      </div>
    </motion.div>
  );
};

export const Dashboard = ({ onMenuClick }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 min-h-screen">
      {/* Mobile Header */}
      <header className="h-16 px-4 border-b border-slate-800/50 flex items-center lg:hidden bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-400 hover:text-white"
        >
          <Menu size={20} />
        </button>
        <div className="ml-3 font-mono font-bold text-sm tracking-tighter text-white">
          AGENTE<span className="text-blue-600">X</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <header className="mb-8 md:mb-10">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Zap size={14} className="fill-current" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Operational Readiness Level: 4</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">Command Overview</h1>
          <p className="text-slate-400 max-w-2xl text-xs md:text-sm leading-relaxed">
            Proprietary AI orchestration environment synchronized for enterprise automation. 
            All integrated ERP endpoints are reporting nominal status.
          </p>
        </header>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
          {[
            { label: 'Active Sessions', val: '4,102', icon: Users, color: 'text-blue-500' },
            { label: 'Success Rate', val: '99.98%', icon: Target, color: 'text-emerald-500' },
            { label: 'Resources', val: '0.4Tf', icon: Zap, color: 'text-amber-500' },
            { label: 'Accuracy', val: '0.94', icon: Shield, color: 'text-sky-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-3 md:p-4 flex items-center gap-3 md:gap-4 rounded-sm">
              <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-sm bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0", stat.color)}>
                <stat.icon size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] md:text-[10px] uppercase font-bold text-slate-500 tracking-widest truncate">{stat.label}</div>
                <div className="text-sm md:text-xl font-mono font-bold text-slate-200">{stat.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Agent Grid */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs uppercase font-bold tracking-[0.2em] text-slate-500">Autonomous Agents</h2>
            <button className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-400 tracking-widest transition-colors">Deploy New Instance +</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AGENTS.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};