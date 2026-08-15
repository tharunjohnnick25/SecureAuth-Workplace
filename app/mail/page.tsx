'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { format, isToday } from 'date-fns';
import { 
  Inbox, Send, Star, Trash, Search, MoreVertical, Edit3, X, Reply, Forward, Archive, CornerUpLeft, Mic, MicOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';

type Folder = 'inbox' | 'sent' | 'starred' | 'trash' | 'gmail';

interface Email {
  id: string;
  owner_id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  folder: Folder;
  is_read: boolean;
  is_starred: boolean;
  created_at: string;
  sender: { id: string; name: string; email: string; avatar: string } | null;
  recipient: { id: string; name: string; email: string; avatar: string } | null;
}

export default function MailPage() {
  const { user } = useAuthStore();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [hasGmail, setHasGmail] = useState(false);
  
  // Compose state
  const [isComposing, setIsComposing] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string; avatar: string }[]>([]);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSending, setIsSending] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const { isListening, toggleVoiceInput } = useVoiceInput((text) => setComposeBody(prev => prev + (prev ? ' ' : '') + text));

  useEffect(() => {
    // Check if user just authenticated Gmail
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') === 'true') {
      localStorage.setItem('gmail_connected', 'true');
      window.history.replaceState({}, document.title, '/mail');
    }
    if (localStorage.getItem('gmail_connected') === 'true') {
      setHasGmail(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (activeFolder === 'gmail') {
        fetchGmail();
      } else {
        fetchEmails(activeFolder);
      }
    }
  }, [user, activeFolder]);

  useEffect(() => {
    if (isComposing && employees.length === 0) {
      // Fetch employees for autocomplete, filtered by the current user's company domain
      const domain = user?.email?.split('@')[1];
      const url = domain ? `/api/employees?domain=${domain}&limit=1000` : '/api/employees?limit=1000';
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setEmployees(data.data.map((e: any) => ({
              id: e.id,
              name: e.full_name,
              email: e.email,
              avatar: e.profile_picture
            })));
          }
        });
    }
  }, [isComposing, user]);

  const fetchEmails = async (folder: Folder) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/mail?folder=${folder}`, {
        headers: { 'x-user-id': user!.id }
      });
      const data = await res.json();
      if (res.ok) {
        setEmails(data.data);
      }
    } catch (err) {
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const fetchGmail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/gmail/messages`);
      const data = await res.json();
      if (res.ok) {
        setEmails(data.data);
      } else {
        toast.error('Failed to load Gmail. Please reconnect.');
        setHasGmail(false);
        localStorage.removeItem('gmail_connected');
        setActiveFolder('inbox');
      }
    } catch (err) {
      toast.error('Failed to load Gmail');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (email: Email) => {
    if (email.is_read) return;
    
    // Optimistic update
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e));
    if (selectedEmail?.id === email.id) {
      setSelectedEmail({ ...email, is_read: true });
    }

    try {
      await fetch(`/api/mail/${email.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id },
        body: JSON.stringify({ is_read: true })
      });
    } catch {
      // Revert if failed (ignoring for brevity)
    }
  };

  const toggleStar = async (e: React.MouseEvent, email: Email) => {
    e.stopPropagation();
    const newStarred = !email.is_starred;
    
    setEmails(prev => {
      // If we are in 'starred' view and we unstar, remove from list
      if (activeFolder === 'starred' && !newStarred) {
        return prev.filter(x => x.id !== email.id);
      }
      return prev.map(x => x.id === email.id ? { ...x, is_starred: newStarred } : x);
    });
    
    if (selectedEmail?.id === email.id) {
      setSelectedEmail({ ...email, is_starred: newStarred });
    }

    try {
      await fetch(`/api/mail/${email.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id },
        body: JSON.stringify({ is_starred: newStarred })
      });
    } catch {
      toast.error('Failed to update star');
    }
  };

  const deleteEmail = async (e: React.MouseEvent | null, email: Email) => {
    if (e) e.stopPropagation();
    
    try {
      if (email.folder === 'trash') {
        // Permanently delete
        await fetch(`/api/mail/${email.id}`, {
          method: 'DELETE',
          headers: { 'x-user-id': user!.id }
        });
        toast.success('Email permanently deleted');
      } else {
        // Move to trash
        await fetch(`/api/mail/${email.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id },
          body: JSON.stringify({ folder: 'trash' })
        });
        toast.success('Conversation moved to Trash.');
      }

      setEmails(prev => prev.filter(x => x.id !== email.id));
      if (selectedEmail?.id === email.id) setSelectedEmail(null);
    } catch {
      toast.error('Failed to delete email');
    }
  };

  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject) return;

    // Find recipient ID from the composeTo string (usually email)
    const recipient = employees.find(emp => emp.email === composeTo);
    if (!recipient) {
      toast.error('Recipient not found. Please enter a valid employee email.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id },
        body: JSON.stringify({
          recipient_id: recipient.id,
          subject: composeSubject,
          body: composeBody
        })
      });

      if (res.ok) {
        toast.success('Message sent.');
        setIsComposing(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        if (activeFolder === 'sent') fetchEmails('sent');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to send email');
      }
    } catch {
      toast.error('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const formatEmailTime = (isoString: string) => {
    const date = new Date(isoString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    return format(date, 'MMM d');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const unreadCount = useMemo(() => emails.filter(e => !e.is_read).length, [emails]);
  
  const filteredEmails = useMemo(() => {
    if (!searchQuery) return emails;
    const lowerQ = searchQuery.toLowerCase();
    return emails.filter(e => 
      e.subject.toLowerCase().includes(lowerQ) || 
      e.body.toLowerCase().includes(lowerQ) ||
      (e.sender?.name || '').toLowerCase().includes(lowerQ)
    );
  }, [emails, searchQuery]);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 pt-24 overflow-hidden">
          <div className="flex h-[calc(100vh-12rem)] rounded-2xl border border-white/10 bg-[#0a0f1c] overflow-hidden">
      {/* Folder Sidebar */}
      <div className="w-64 border-r border-white/5 bg-[#0a0f1c]/90 backdrop-blur-xl flex flex-col shrink-0">
        <div className="p-4 pt-6">
          <button 
            onClick={() => setIsComposing(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Edit3 className="w-5 h-5" />
            Compose
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          <FolderItem icon={<Inbox className="w-5 h-5" />} label="Inbox" id="inbox" active={activeFolder} onClick={setActiveFolder} badge={activeFolder === 'inbox' && unreadCount > 0 ? unreadCount : undefined} />
          <FolderItem icon={<Star className="w-5 h-5" />} label="Starred" id="starred" active={activeFolder} onClick={setActiveFolder} />
          <FolderItem icon={<Send className="w-5 h-5" />} label="Sent" id="sent" active={activeFolder} onClick={setActiveFolder} />
          <FolderItem icon={<Trash className="w-5 h-5" />} label="Trash" id="trash" active={activeFolder} onClick={setActiveFolder} />
          
          <div className="pt-4 mt-4 border-t border-white/5">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Integrations</p>
            {hasGmail ? (
              <FolderItem icon={<img src="https://mail.google.com/favicon.ico" alt="Gmail" className="w-5 h-5" />} label="Gmail Inbox" id="gmail" active={activeFolder} onClick={setActiveFolder} />
            ) : (
              <div className="px-4 mt-2">
                <button 
                  onClick={() => window.location.href = '/api/gmail/auth'}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <img src="https://mail.google.com/favicon.ico" alt="Gmail" className="w-4 h-4 grayscale opacity-70" />
                  Connect Gmail
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Email List */}
      <div className={`w-full md:w-96 border-r border-white/5 bg-[#0a0f1c]/80 backdrop-blur-md flex flex-col shrink-0 transition-all ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mail"
              className="w-full bg-[#1a2133] text-white border border-transparent focus:border-blue-500/50 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8 text-blue-500">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <p className="text-sm">Nothing in {activeFolder}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredEmails.map(email => {
                const isSelected = selectedEmail?.id === email.id;
                // If in sent folder, show recipient. Otherwise show sender.
                const displayPerson = activeFolder === 'sent' ? email.recipient : email.sender;
                const displayAvatar = displayPerson?.avatar;
                
                return (
                  <div 
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      markAsRead(email);
                    }}
                    className={`p-4 cursor-pointer transition-colors group relative ${
                      isSelected ? 'bg-blue-600/10' : 'hover:bg-white/5'
                    } ${!email.is_read ? 'bg-white/[0.02]' : ''}`}
                  >
                    <div className="flex gap-3">
                      {displayAvatar ? (
                        <img src={displayAvatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {getInitials(displayPerson?.name)}
                        </div>
                      )}
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between mb-0.5">
                          <span className={`text-sm truncate mr-2 ${!email.is_read ? 'font-bold text-white' : 'text-gray-300'}`}>
                            {activeFolder === 'sent' ? `To: ${displayPerson?.name}` : displayPerson?.name}
                          </span>
                          <span className={`text-xs whitespace-nowrap ${!email.is_read ? 'font-bold text-blue-400' : 'text-gray-500'}`}>
                            {formatEmailTime(email.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate ${!email.is_read ? 'font-semibold text-white' : 'text-gray-300'}`}>
                            {email.subject}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{email.body}</p>
                      </div>
                    </div>
                    
                    {/* Hover actions */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 bg-[#0a0f1c] shadow-[0_0_10px_10px_#0a0f1c] rounded-full px-1">
                      <button onClick={(e) => toggleStar(e, email)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-yellow-400">
                        <Star className={`w-4 h-4 ${email.is_starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </button>
                      <button onClick={(e) => deleteEmail(e, email)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reading Pane */}
      <div className={`flex-1 bg-[#0a0f1c] flex flex-col min-w-0 ${!selectedEmail ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!selectedEmail ? (
          <div className="text-center text-gray-500 flex flex-col items-center">
            <div className="w-20 h-20 bg-[#1a2133] rounded-full flex items-center justify-center mb-4">
              <Inbox className="w-10 h-10 text-gray-400" />
            </div>
            <p>Select an item to read</p>
            <p className="text-sm mt-1">Nothing is selected</p>
          </div>
        ) : (
          <>
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedEmail(null)} className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-full">
                  <CornerUpLeft className="w-5 h-5 text-gray-400" />
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => deleteEmail(null, selectedEmail)} className="p-2 hover:bg-white/10 rounded-full text-gray-400" title="Delete">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-start justify-between mb-8">
                  <h1 className="text-2xl font-normal text-white">{selectedEmail.subject}</h1>
                </div>

                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    {selectedEmail.sender?.avatar ? (
                      <img src={selectedEmail.sender.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg">
                        {getInitials(selectedEmail.sender?.name)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{selectedEmail.sender?.name}</span>
                        <span className="text-xs text-gray-500">&lt;{selectedEmail.sender?.email}&gt;</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        to {selectedEmail.recipient?.name === user?.full_name ? 'me' : selectedEmail.recipient?.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{format(new Date(selectedEmail.created_at), 'MMM d, yyyy, h:mm a')}</span>
                    <button onClick={(e) => toggleStar(e, selectedEmail)} className="text-gray-400 hover:text-yellow-400">
                      <Star className={`w-5 h-5 ${selectedEmail.is_starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </button>
                    <button onClick={() => {
                      setComposeTo(selectedEmail.sender?.email || '');
                      setComposeSubject(`Re: ${selectedEmail.subject.replace(/^Re: /, '')}`);
                      setIsComposing(true);
                    }} className="text-gray-400 hover:text-white">
                      <Reply className="w-5 h-5" />
                    </button>
                    <div className="relative">
                      <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {showMoreMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                          <div className="absolute right-0 mt-2 w-48 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl py-1 z-50">
                            <button onClick={() => {
                              setComposeSubject(`Fwd: ${selectedEmail.subject.replace(/^Fwd: /, '')}`);
                              setComposeBody(`\n\n---------- Forwarded message ---------\nFrom: ${selectedEmail.sender?.name} <${selectedEmail.sender?.email}>\nDate: ${format(new Date(selectedEmail.created_at), 'MMM d, yyyy, h:mm a')}\nSubject: ${selectedEmail.subject}\nTo: ${selectedEmail.recipient?.name} <${selectedEmail.recipient?.email}>\n\n${selectedEmail.body}`);
                              setComposeTo('');
                              setIsComposing(true);
                              setShowMoreMenu(false);
                            }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors">
                              <Forward className="w-4 h-4" /> Forward
                            </button>
                            <button onClick={async () => {
                              setShowMoreMenu(false);
                              try {
                                const res = await fetch(`/api/mail/${selectedEmail.id}`, { method: 'DELETE' });
                                if (res.ok) {
                                  toast.success('Conversation moved to trash');
                                  setSelectedEmail(null);
                                  fetchEmails();
                                }
                              } catch (e) {
                                toast.error('Failed to delete email');
                              }
                            }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors">
                              <Trash className="w-4 h-4" /> Delete this message
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedEmail.body}
                </div>

                <div className="mt-12 flex gap-3">
                  <button 
                    onClick={() => {
                      setComposeTo(selectedEmail.sender?.email || '');
                      setComposeSubject(`Re: ${selectedEmail.subject.replace(/^Re: /, '')}`);
                      setIsComposing(true);
                    }}
                    className="px-5 py-2 rounded-full border border-gray-600 hover:bg-gray-800 text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Reply className="w-4 h-4" /> Reply
                  </button>
                  <button 
                    onClick={() => {
                      setComposeSubject(`Fwd: ${selectedEmail.subject.replace(/^Fwd: /, '')}`);
                      setComposeBody(`\n\n---------- Forwarded message ---------\nFrom: ${selectedEmail.sender?.name} <${selectedEmail.sender?.email}>\nDate: ${format(new Date(selectedEmail.created_at), 'MMM d, yyyy, h:mm a')}\nSubject: ${selectedEmail.subject}\nTo: ${selectedEmail.recipient?.name} <${selectedEmail.recipient?.email}>\n\n${selectedEmail.body}`);
                      setComposeTo('');
                      setIsComposing(true);
                    }}
                    className="px-5 py-2 rounded-full border border-gray-600 hover:bg-gray-800 text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Forward className="w-4 h-4" /> Forward
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
          </div>
        </main>
      </div>

      {/* Compose Modal */}
      {isComposing && (
        <div className="fixed bottom-0 right-12 w-full max-w-lg bg-[#1a2133] rounded-t-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col overflow-hidden z-50">
          <div className="bg-[#2a3447] px-4 py-3 flex items-center justify-between cursor-pointer">
            <span className="text-sm font-semibold">New Message</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsComposing(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <form onSubmit={sendEmail} className="flex flex-col flex-1">
            <div className="border-b border-white/5 px-4 py-2 flex items-center">
              <span className="text-gray-500 text-sm w-12">To</span>
              <input 
                type="text" 
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="Employee email (e.g., admin@test.com)"
                className="flex-1 bg-transparent text-sm outline-none py-1"
                required
                list="employee-emails"
              />
              <datalist id="employee-emails">
                {employees.map(e => <option key={e.id} value={e.email}>{e.name}</option>)}
              </datalist>
            </div>
            <div className="border-b border-white/5 px-4 py-2 flex items-center">
              <input 
                type="text" 
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 bg-transparent text-sm outline-none py-1 font-semibold"
                required
              />
            </div>
            <div className="flex-1 p-4 min-h-[300px]">
              <textarea 
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                className="w-full h-full bg-transparent text-sm outline-none resize-none"
                required
              />
            </div>
            <div className="bg-[#2a3447] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button type="submit" disabled={isSending} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-6 py-2 rounded-full shadow-md disabled:opacity-50 transition-colors">
                  {isSending ? 'Sending...' : 'Send'}
                </button>
                <button 
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                  title="Dictate Email Body"
                >
                  {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              <button type="button" onClick={() => setIsComposing(false)} className="text-gray-400 hover:text-gray-300">
                <Trash className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function FolderItem({ icon, label, id, active, onClick, badge }: any) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-r-full mr-4 transition-colors ${
        isActive ? 'bg-blue-600/10 text-blue-400 font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      {badge !== undefined && (
        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}
