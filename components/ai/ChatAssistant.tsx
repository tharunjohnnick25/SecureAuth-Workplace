'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  X, 
  Send, 
  Shield, 
  Zap, 
  Info, 
  ShieldAlert, 
  Lock,
  Sparkles,
  MessageSquare,
  ChevronDown,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

export function ChatAssistant() {
    const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I am your SecureAuth Workplace Assistant. How can I help secure your account today?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const data = await res.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I'm analyzing that security query. Please ensure your account has MFA enabled for maximum protection."
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error("Failed to connect to AI engine");
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Check my security score",
    "How to enable MFA?",
    "What is brute force?",
    "Review recent logins"
  ];

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] group hover:scale-110 transition-all border border-white/20"
          >
            <Bot className="text-white w-8 h-8 group-hover:rotate-12 transition-transform" />
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#020617]"
            ></motion.div>
          </motion.button>
        ) : (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="w-96 h-[550px] bg-[#0f0f23]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Bot className="text-blue-400 w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-sm font-bold text-white flex items-center gap-2">
                     {'Cyber assistant'}<Sparkles className="w-3 h-3 text-purple-400" />
                   </h3>
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{'Neural logic onli'}</span>
                   </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((m) => (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/20' 
                      : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                  }`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-none flex gap-1">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
               {suggestions.map((s, i) => (
                 <button 
                  key={i}
                  onClick={() => { setInput(s); }}
                  className="whitespace-nowrap px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-gray-400 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 transition-all"
                 >
                   {s}
                 </button>
               ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-black/20">
               <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ask security question..." 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 text-sm outline-none focus:border-blue-500/50 transition-all text-white"
                  />
                  <button 
                    type="submit"
                    className="absolute right-1.5 top-1.5 w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
               </div>
               <div className="mt-3 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-green-500" />
                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">{'Verified logic'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-blue-500" />
                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">{'Secure link'}</span>
                  </div>
               </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
