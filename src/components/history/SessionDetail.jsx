// src/components/history/SessionDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bot, User, Loader2, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm    from 'remark-gfm';
import { motion }   from 'motion/react';
import { cn }       from '../../lib/utils';
import { apiFetch } from '../../lib/apiFetch';

export const SessionDetail = ({ sessionId, onBack, onMenuClick }) => {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    apiFetch(`/api/sessions/${sessionId}/messages`)
      .then(r => r.json())
      .then(d => { if (d.success) setMessages(d.messages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 min-h-screen">
      {/* Header */}
      <header className="h-16 px-4 md:px-6 border-b border-slate-800/50 flex items-center gap-3 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-400 hover:text-white lg:hidden">
          <Menu size={20} />
        </button>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          <span className="font-mono text-xs uppercase tracking-widest">Historial</span>
        </button>
        <div className="h-4 w-px bg-slate-800" />
        <span className="text-xs font-mono text-slate-500">Sesión #{sessionId}</span>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-6 pb-12">
        <div className="max-w-3xl mx-auto px-4">
          {loading ? (
            <div className="flex items-center gap-3 text-slate-500 py-20 justify-center">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs font-mono">Cargando mensajes...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-slate-600 text-sm text-center py-16">Sin mensajes en esta sesión.</div>
          ) : (
            messages.map((msg, i) => {
              const isAI = msg.sender_type === 'IA';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    'flex w-full mb-5 gap-3',
                    isAI ? 'items-start' : 'items-start flex-row-reverse'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 mt-1 border',
                    isAI ? 'bg-slate-900 border-slate-800 text-blue-500' : 'bg-blue-600 border-blue-500 text-white'
                  )}>
                    {isAI ? <Bot size={15} /> : <User size={15} />}
                  </div>

                  <div className={cn('flex flex-col max-w-[85%]', isAI ? 'items-start' : 'items-end')}>
                    <div className={cn(
                      'px-4 py-3 rounded-sm text-sm border shadow-md w-full',
                      isAI ? 'bg-slate-900/80 border-slate-800 text-slate-100' : 'bg-blue-600 text-white border-blue-500'
                    )}>
                      <div className={cn('text-sm leading-relaxed', !isAI && 'text-white')}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ node, ...props }) => (
                              <div className="overflow-x-auto w-full my-3 border border-slate-700/50 rounded-sm">
                                <table className="w-full text-left text-sm border-collapse" {...props} />
                              </div>
                            ),
                            thead: ({ node, ...props }) => <thead className="bg-slate-800/80 border-b border-slate-700/50 font-mono text-[11px] text-slate-400 uppercase tracking-wider" {...props} />,
                            th:    ({ node, ...props }) => <th className="px-4 py-2.5 font-semibold whitespace-nowrap" {...props} />,
                            td:    ({ node, ...props }) => <td className="px-4 py-2 border-b border-slate-800/50 whitespace-nowrap text-slate-200" {...props} />,
                            p:     ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>

                    <div className="mt-1 text-[10px] font-mono text-slate-600 uppercase tracking-widest px-1 flex items-center gap-2">
                      {new Date(msg.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      {isAI && msg.prompt_tokens > 0 && (
                        <span className="text-slate-700">· {msg.prompt_tokens + msg.completion_tokens} tokens</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
