import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Bot, User, Database, CheckCircle, Loader2, Sparkles, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const MessageCard = ({ message }) => {
    const isAI = message.role === 'assistant';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex w-full mb-6 gap-3 md:gap-4 px-3 md:px-4",
                isAI ? "items-start" : "items-start flex-row-reverse"
            )}
        >
            <div className={cn(
                "w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 mt-1 shadow-sm border",
                isAI
                    ? "bg-slate-900 border-slate-800 text-blue-500"
                    : "bg-blue-600 border-blue-500 text-white"
            )}>
                {isAI ? <Bot size={18} /> : <User size={18} />}
            </div>

            <div className={cn(
                "flex flex-col max-w-[85%] md:max-w-[80%]",
                isAI ? "items-start" : "items-end"
            )}>
                <div className={cn(
                    "px-3 py-2 md:px-4 md:py-3 rounded-sm text-sm border shadow-md",
                    isAI
                        ? "bg-slate-900/80 border-slate-800 text-slate-100"
                        : "bg-blue-600 text-white border-blue-500"
                )}>
                    <div className={cn("prose prose-invert prose-sm leading-relaxed max-w-none", !isAI && "text-white")}>
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>

                    {isAI && message.metadata && (
                        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-3">
                            {message.metadata.erpStatus && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
                                    <Database size={12} className="text-emerald-500" />
                                    <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase">ERP SYNCED</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-1.5 text-[10px] font-mono text-slate-600 uppercase tracking-widest px-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • LOGGED
                </div>
            </div>
        </motion.div>
    );
};

export const ChatInterface = ({ agentId, onMenuClick }) => {
    const [messages, setMessages] = useState([{
        id: '1',
        role: 'assistant',
        content: '# Enlace Activo\nSistema de orquestación en línea. Esperando comandos o consultas de inventario.',
        timestamp: new Date(),
        metadata: { erpStatus: 'synced' }
    }]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input.trim();

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: userText,
            timestamp: new Date()
        };

        // 1. Extraemos el historial actual (excluyendo el saludo inicial con id '1')
        const currentHistory = messages
            .filter(msg => msg.id !== '1')
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // 2. Construimos el Payload EXACTO que espera Node.js
        const payload = {
            message: userText,
            agent_id: agentId,
            history: currentHistory
        };

        try {
            const response = await fetch(`${API_URL}/api/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload) // Enviamos el payload corregido
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // 3. Leemos data.reply (como devuelve tu backend)
            const aiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.reply || "Error: No se recibió respuesta del orquestador.",
                timestamp: new Date(),
                metadata: {
                    erpStatus: 'synced'
                }
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Error en el pipeline de IA:", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `**CRITICAL ERROR:** Fallo de comunicación con el orquestador. \nDetalle: ${error.message}`,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden h-full font-sans">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#2563eb_1px,transparent_1px)] [background-size:20px_20px]" />

            <header className="h-16 px-4 md:px-6 border-b border-slate-800/50 flex items-center justify-between z-10 bg-slate-950/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-400 hover:text-white lg:hidden">
                        <Menu size={20} />
                    </button>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 hidden md:block animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <h2 className="text-[11px] md:text-sm font-bold tracking-tight text-slate-100 font-mono truncate">
                        CHANNEL: OPS-{agentId?.toUpperCase() || 'MAIN'}-COMMAND
                    </h2>
                </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto pt-4 md:pt-8 pb-12 z-10 scrollbar-thin scrollbar-thumb-slate-800">
                <div className="max-w-4xl mx-auto">
                    {messages.map(msg => (
                        <MessageCard key={msg.id} message={msg} />
                    ))}

                    {isLoading && (
                        <div className="flex gap-4 px-4 items-start">
                            <div className="w-8 h-8 rounded-sm bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-500 animate-pulse mt-1">
                                <Loader2 size={18} className="animate-spin" />
                            </div>
                            <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-sm flex items-center gap-3">
                                <span className="text-xs font-mono text-slate-400">Ejecutando orquestador y consultando ERP...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-3 md:p-6 z-10">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSend} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-1 rounded-sm shadow-2xl relative group focus-within:border-blue-600/50 transition-colors">
                        <div className="absolute -top-3 left-6 px-2 bg-slate-950 text-[10px] font-mono font-bold text-slate-500 tracking-widest uppercase">
                            Command Input
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 px-1 md:px-2">
                            <button type="button" className="p-2 md:p-3 text-slate-500 hover:text-blue-500 transition-colors rounded-sm">
                                <Paperclip size={18} />
                            </button>
                            <input
                                type="text"
                                placeholder="Dime el precio del artículo 18..."
                                className="flex-1 bg-transparent border-none py-3 md:py-4 px-1 md:px-2 text-sm text-slate-100 focus:outline-none placeholder:text-slate-700"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className={cn(
                                    "p-2 md:p-3 rounded-sm transition-all flex items-center gap-2",
                                    input.trim() && !isLoading
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "bg-slate-900 border border-slate-800 text-slate-700 pointer-events-none"
                                )}
                            >
                                <span className="text-xs font-bold uppercase tracking-widest hidden md:block">EXECUTE</span>
                                <Send size={18} />
                            </button>
                        </div>
                    </form>

                    <div className="mt-3 flex items-center justify-center gap-6 opacity-30">
                        <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                            <Sparkles size={10} /> Live API
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                            <CheckCircle size={10} /> Secure Tunnel
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};