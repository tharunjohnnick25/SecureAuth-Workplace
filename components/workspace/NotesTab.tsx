'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, Pin, Trash2, Palette, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

const COLORS = [
  'bg-white/5',
  'bg-red-900/40',
  'bg-orange-900/40',
  'bg-yellow-900/40',
  'bg-green-900/40',
  'bg-teal-900/40',
  'bg-blue-900/40',
  'bg-indigo-900/40',
  'bg-purple-900/40',
  'bg-pink-900/40'
];

export function NotesTab() {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // New Note State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState('bg-white/5');
  const createRef = useRef<HTMLDivElement>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notes?user_id=${user?.id}`);
      const data = await res.json();
      if (data.success) setNotes(data.data);
    } catch {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleCreateNote = useCallback(async () => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          color: newColor
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create note');
      }

      setNewTitle('');
      setNewContent('');
      setNewColor('bg-white/5');
      setIsCreating(false);
      loadNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create note');
    }
  }, [newTitle, newContent, newColor, loadNotes]);

  const handleUpdateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    try {
      // Optimistic update
      setNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));

      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update note');
      loadNotes(); // Refetch to ensure correct sorting and timestamps
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update note');
      loadNotes(); // Revert on error
    }
  }, [notes, loadNotes]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      setNotes(notes.filter(n => n.id !== id));
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Note deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
      loadNotes();
    }
  }, [notes, loadNotes]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/notes?user_id=${user.id}`);
        const data = await res.json();
        if (!cancelled && data.success) setNotes(data.data);
      } catch {
        if (!cancelled) toast.error('Failed to load notes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Click outside listener for the create box
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (createRef.current && !createRef.current.contains(event.target as Node)) {
        if (isCreating && (newTitle.trim() || newContent.trim())) {
          handleCreateNote();
        } else {
          setIsCreating(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCreating, newTitle, newContent, handleCreateNote]);

  return (
    <div className="w-full">

          {/* Create Note Input */}
          <div className="flex justify-center mb-16 mt-8 relative z-10">
            <div 
              ref={createRef}
              className={`w-full max-w-2xl bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-300 overflow-hidden group ${newColor} ${isCreating ? 'ring-2 ring-blue-500/50 scale-[1.02]' : 'hover:border-white/20 hover:shadow-blue-500/10'}`}
              onClick={() => !isCreating && setIsCreating(true)}
            >
              {isCreating ? (
                <div className="p-5 flex flex-col gap-4">
                  <input
                    type="text"
                    placeholder="Title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-transparent border-none text-white font-bold text-xl outline-none placeholder:text-gray-500"
                  />
                  <textarea
                    placeholder="Take a note..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    autoFocus
                    className="w-full bg-transparent border-none text-white text-base outline-none resize-none placeholder:text-gray-500 min-h-[120px]"
                  />
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex gap-2">
                      <div className="relative group/palette">
                        <button className="p-2.5 rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                          <Palette className="w-5 h-5" />
                        </button>
                        <div className="absolute top-full left-0 pt-2 hidden group-hover/palette:block z-50">
                          <div className="p-3 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl flex gap-2 flex-wrap w-[220px]">
                            {COLORS.map(c => (
                              <button 
                                key={c} 
                                onClick={(e) => { e.stopPropagation(); setNewColor(c); }}
                                className={`w-7 h-7 rounded-full ${c} border ${newColor === c ? 'border-white scale-110' : 'border-white/20'} hover:scale-110 transition-all`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsCreating(false); }}
                        className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleCreateNote(); }}
                        className="px-5 py-2 bg-white text-black rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors shadow-lg"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 flex items-center justify-between cursor-text">
                  <span className="text-gray-400 text-base font-medium">Take a note...</span>
                  <div className="flex items-center gap-2 opacity-60">
                    <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </button>
                    <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                      <Palette className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes Grid */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : (
            <>
              {notes.some(n => n.is_pinned) && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 ml-2">Pinned</h3>
                  <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                    {notes.filter(n => n.is_pinned).map(note => (
                      <NoteCard key={note.id} note={note} onUpdate={handleUpdateNote} onDelete={handleDelete} colors={COLORS} />
                    ))}
                  </div>
                </div>
              )}

              {notes.some(n => !n.is_pinned) && (
                <div>
                  {notes.some(n => n.is_pinned) && <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 ml-2">Others</h3>}
                  <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                    {notes.filter(n => !n.is_pinned).map(note => (
                      <NoteCard key={note.id} note={note} onUpdate={handleUpdateNote} onDelete={handleDelete} colors={COLORS} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

    </div>
  );
}

function NoteCard({ note, onUpdate, onDelete, colors }: { note: Note, onUpdate: (id: string, updates: Partial<Note>) => void, onDelete: (id: string) => void, colors: string[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);

  const handleSave = () => {
    if (editTitle !== note.title || editContent !== note.content) {
      onUpdate(note.id, { title: editTitle, content: editContent });
    }
    setIsEditing(false);
  };

  return (
    <div className={`group break-inside-avoid rounded-2xl border border-white/10 p-4 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${note.color} ${isEditing ? 'ring-1 ring-white/30' : ''}`}>
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <input 
            type="text" 
            value={editTitle} 
            onChange={e => setEditTitle(e.target.value)} 
            className="w-full bg-transparent border-none text-white font-semibold outline-none" 
            placeholder="Title"
          />
          <textarea 
            value={editContent} 
            onChange={e => setEditContent(e.target.value)} 
            className="w-full bg-transparent border-none text-white text-sm outline-none min-h-[100px] resize-none" 
            placeholder="Note content"
          />
          <div className="flex justify-end mt-2">
            <button onClick={handleSave} className="text-xs font-medium px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20">Save</button>
          </div>
        </div>
      ) : (
        <div onClick={() => setIsEditing(true)} className="cursor-text min-h-[60px]">
          {note.title && <h4 className="font-semibold text-white mb-2 pr-8">{note.title}</h4>}
          <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{note.content}</p>
        </div>
      )}

      {/* Action Bar (Visible on Hover) */}
      <div className={`flex items-center justify-between mt-4 transition-opacity duration-200 ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <div className="flex items-center gap-1">
          <div className="relative group/palette">
            <button className="p-1.5 rounded-full hover:bg-black/20 text-white/70 hover:text-white transition-colors">
              <Palette className="w-4 h-4" />
            </button>
            <div className="absolute bottom-full left-0 pb-2 hidden group-hover/palette:block z-50">
              <div className="p-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl flex gap-1 flex-wrap w-[200px]">
                {colors.map(c => (
                  <button 
                    key={c} 
                    onClick={(e) => { e.stopPropagation(); onUpdate(note.id, { color: c }); }}
                    className={`w-6 h-6 rounded-full ${c} border border-white/20 hover:scale-110 transition-transform`} 
                  />
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => onDelete(note.id)} className="p-1.5 rounded-full hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={() => onUpdate(note.id, { is_pinned: !note.is_pinned })}
          className={`p-1.5 rounded-full hover:bg-black/20 transition-colors ${note.is_pinned ? 'text-blue-400' : 'text-white/70 hover:text-white'}`}
        >
          <Pin className="w-4 h-4" fill={note.is_pinned ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
}
