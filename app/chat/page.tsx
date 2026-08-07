'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Search, Send, Loader2, MessageSquare, Users, GitBranch, Mic, MicOff } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface ChatParticipant {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
}

interface Conversation {
  id: string;
  key: string;
  participants: ChatParticipant[];
  created_at: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count?: number;
  is_favorite?: boolean;
  has_mention?: boolean;
  is_invite?: boolean;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_employee_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface EmployeeHit {
  id: string;
  employee_id?: string;
  full_name?: string;
  email?: string;
  department?: string;
  designation?: string;
  role?: string;
}

const CHAT_UI_STORAGE_KEY = 'secureauth-chat-ui';

function loadUiState() {
  if (typeof window === 'undefined') return { activeConversationId: '', draft: '' };
  try {
    const raw = localStorage.getItem(CHAT_UI_STORAGE_KEY);
    if (!raw) return { activeConversationId: '', draft: '' };
    const parsed = JSON.parse(raw);
    return {
      activeConversationId: parsed.activeConversationId || '',
      draft: parsed.draft || '',
    };
  } catch {
    return { activeConversationId: '', draft: '' };
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function displayName(p: ChatParticipant) {
  return p.full_name || p.employee_id;
}

export default function ChatPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState(loadUiState().activeConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmployeeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [draft, setDraft] = useState(loadUiState().draft);
  const [sending, setSending] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [githubEvents, setGithubEvents] = useState<any[]>([]);
  const [loadingGithub, setLoadingGithub] = useState(true);

  const { isListening, toggleVoiceInput } = useVoiceInput((text) => setDraft(prev => prev + (prev ? ' ' : '') + text));
  const bottomRef = useRef<HTMLDivElement>(null);

  const self = useMemo(() => {
    return user
      ? {
          id: user.id,
          employee_id: user.employee_id || user.email || '',
          full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || user.id,
          role: user.role || 'Employee',
        }
      : null;
  }, [user]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const otherParticipant = activeConversation?.participants.find((p) => p.employee_id !== self?.employee_id) || null;

  const refreshConversations = useCallback(async () => {
    if (!self?.employee_id) return;
    try {
      const res = await fetch(`/api/chat?user_id=${encodeURIComponent(self.employee_id)}`);
      const data = await res.json();
      if (data.success) setConversations(data.data || []);
    } catch {}
  }, [self]);

  const refreshMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(conversationId)}`);
      const data = await res.json();
      if (data.success) setMessages(data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    setLoadingConv(true);
    refreshConversations().finally(() => setLoadingConv(false));
  }, [refreshConversations]);

  useEffect(() => {
    if (!activeConversationId) return;
    refreshMessages(activeConversationId);
    const timer = setInterval(() => refreshMessages(activeConversationId), 5000);
    return () => clearInterval(timer);
  }, [activeConversationId, refreshMessages]);

  useEffect(() => {
    const timer = setInterval(() => refreshConversations(), 7000);
    return () => clearInterval(timer);
  }, [refreshConversations]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_UI_STORAGE_KEY, JSON.stringify({ activeConversationId, draft }));
    } catch {}
  }, [activeConversationId, draft]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const fetchGithub = async () => {
      try {
        setLoadingGithub(true);
        const res = await fetch('/api/github');
        const data = await res.json();
        if (data.success) setGithubEvents(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingGithub(false);
      }
    };
    fetchGithub();
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    setSearchOpen(true);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/employees?search=${encodeURIComponent(q.trim())}&limit=20`);
      const data = await res.json();
      if (data.success) {
        const mine = self?.employee_id || '';
        setSearchResults((data.data || []).filter((e: EmployeeHit) => (e.employee_id || '') !== mine));
      }
    } catch {}
    setSearching(false);
  };

  const startConversation = async (employee: EmployeeHit) => {
    if (!self) return;
    setSearchOpen(false);
    setSearchQuery('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ self, other_employee_id: employee.employee_id || employee.id }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshConversations();
        setActiveConversationId(data.data.id);
        await refreshMessages(data.data.id);
      }
    } catch {}
  };

  const openConversation = async (conversation: Conversation) => {
    setActiveConversationId(conversation.id);
    await refreshMessages(conversation.id);
  };

  const sendMessage = async () => {
    if (!self || !activeConversationId || !draft.trim() || sending) return;
    setSending(true);
    const content = draft.trim();
    setDraft('');
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(activeConversationId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_employee_id: self.employee_id,
          sender_name: self.full_name,
          content,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshMessages(activeConversationId);
        await refreshConversations();
      }
    } catch {}
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24 overflow-x-hidden">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-1 tracking-tight flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-500" /> Chat with Colleagues
            </h1>
            <p className="text-gray-400">Search your company directory by employee ID and start a conversation.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-220px)] min-h-[480px]">
            <Card className="lg:col-span-1 bg-black/40 backdrop-blur-xl border-white/10 flex flex-col overflow-hidden p-0">
              <div className="p-4 border-b border-white/10 relative">
                <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-2">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by employee ID or name..."
                    className="bg-transparent flex-1 text-sm text-white placeholder-gray-500 focus:outline-none"
                  />
                  {searching && <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />}
                </div>

                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {['All', 'To me', 'Unread', 'Favorites', 'By me', 'Tags @', 'Invites'].map(f => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        activeFilter === f ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {searchOpen && searchQuery.trim() && (
                  <div className="absolute left-4 right-4 top-[76px] z-20 bg-[#0b1220] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">
                        {searching ? 'Searching...' : 'No co-employees found. Try an employee ID like EMP-MOCK01.'}
                      </div>
                    ) : (
                      searchResults.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => startConversation(e)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold">
                            {(e.full_name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{e.full_name}</p>
                            <p className="text-xs text-gray-400 truncate">
                              <span className="font-mono">{e.employee_id}</span> · {e.designation || e.role || e.department || ''}
                            </p>
                          </div>
                          <Send className="w-4 h-4 text-blue-500" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                <p className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Conversations
                </p>
                  {loadingConv ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No conversations yet. Search a colleague by employee ID above to get started.
                    </div>
                  ) : (
                    conversations.filter(c => {
                      if (activeFilter === 'All') return true;
                      if (activeFilter === 'Unread') return (c.unread_count || 0) > 0;
                      if (activeFilter === 'Favorites') return c.is_favorite;
                      if (activeFilter === 'By me') {
                        // In real app, we'd check if last message was sent by self.
                        // Here we just check if it's not the initial empty message
                        return c.last_message_preview && c.last_message_preview !== 'Say hello!';
                      }
                      if (activeFilter === 'To me') return true; // Direct chats are to me
                      if (activeFilter === 'Tags @') return c.has_mention;
                      if (activeFilter === 'Invites') return c.is_invite;
                      return true;
                    }).map((c) => {
                      const other = c.participants.find((p) => p.employee_id !== self?.employee_id);
                      const active = c.id === activeConversationId;
                      return (
                      <button
                        key={c.id}
                        onClick={() => openConversation(c)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors relative ${
                          active ? 'bg-blue-600/20 border border-blue-600/30' : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {other ? displayName(other).split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase() : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold truncate flex items-center gap-1">
                              {other ? displayName(other) : 'Colleague'}
                              {c.is_favorite && <span className="text-yellow-400 text-xs">★</span>}
                            </p>
                            <span className="text-[10px] text-gray-500 flex-shrink-0">{formatTime(c.last_message_at)}</span>
                          </div>
                          <p className="text-xs text-gray-400 truncate pr-6">
                            {other && <span className="font-mono text-gray-500">{other.employee_id}</span>} · {c.last_message_preview || 'Say hello!'}
                          </p>
                          {(c.unread_count || 0) > 0 && (
                            <span className="absolute right-3 bottom-3 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="lg:col-span-2 bg-black/40 backdrop-blur-xl border-white/10 flex flex-col overflow-hidden p-0">
              {!activeConversation ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Select a conversation</h3>
                  <p className="text-sm text-gray-400 max-w-xs">
                    Pick an existing thread or search a colleague by their employee ID to start chatting.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-xs font-bold">
                      {otherParticipant ? displayName(otherParticipant).split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{otherParticipant ? displayName(otherParticipant) : 'Colleague'}</p>
                      <p className="text-xs text-gray-400">
                        {otherParticipant ? (
                          <>
                            <span className="font-mono">{otherParticipant.employee_id}</span> · {otherParticipant.role || 'Employee'}
                          </>
                        ) : (
                          'Company co-worker'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#050b18]">
                    {messages.length === 0 ? (
                      <div className="text-center text-sm text-gray-500 py-10">No messages yet. Say hello!</div>
                    ) : (
                      messages.map((m) => {
                        const mine = m.sender_employee_id === self?.employee_id;
                        return (
                          <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                mine
                                  ? 'bg-blue-600 text-white rounded-br-sm'
                                  : 'bg-white/10 text-white rounded-bl-sm border border-white/10'
                              }`}
                            >
                              {!mine && (
                                <p className="text-[10px] font-bold text-emerald-400 mb-0.5">{m.sender_name}</p>
                              )}
                              <p className="whitespace-pre-wrap break-words">{m.content}</p>
                              <p className={`text-[10px] mt-1 ${mine ? 'text-blue-200' : 'text-gray-400'}`}>{formatTime(m.created_at)}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div className="p-4 border-t border-white/10 bg-[#020617]/80 backdrop-blur-md">
                    {/* Quick Replies */}
                    <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                      {["Got it, looking into this now.", "Can we schedule a quick meeting?", "I'll update you by EOD.", "Approved.", "Thanks!"].map(template => (
                        <button
                          key={template}
                          onClick={() => setDraft(template)}
                          className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-300 hover:text-white transition-colors whitespace-nowrap"
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                      <Button 
                        onClick={toggleVoiceInput}
                        type="button"
                        className={`p-3 ${isListening ? 'bg-red-500/20 text-red-400' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'} transition-colors border border-white/10`}
                      >
                        {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                      </Button>
                      <Button onClick={sendMessage} disabled={sending || !draft.trim()} className="bg-blue-600 hover:bg-blue-500">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* GitHub Updates Sidebar */}
            <Card className="lg:col-span-1 hidden lg:flex flex-col overflow-hidden h-full border-l border-white/5">
              <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">GitHub Updates</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingGithub ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                ) : githubEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">No recent GitHub activity found.</div>
                ) : (
                  githubEvents.map((ev, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-3 flex gap-3 hover:bg-white/10 transition-colors">
                      <img src={ev.avatar_url} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-white">
                          {ev.employee}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {ev.type === 'PushEvent' ? 'Pushed code to ' : ev.type === 'PullRequestEvent' ? 'Opened a PR in ' : 'Activity in '}
                          <a href={ev.repo_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{ev.repo}</a>
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1.5">{new Date(ev.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
