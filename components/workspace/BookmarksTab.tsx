'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, Globe, Search, Plus, ExternalLink, Trash2, Bookmark } from 'lucide-react';
import { toast } from 'sonner';

export function BookmarksTab() {
  const { user } = useAuthStore();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadBookmarks();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bookmarks?user_id=${user?.id}`);
      const data = await res.json();
      if (data.success) {
        setBookmarks(data.data || []);
      }
    } catch (e) {
      console.error('Bookmark fetch error:', e);
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBookmark = async (result: any) => {
    if (!user?.id) {
      toast.error('User not identified');
      return;
    }
    try {
      setSaving(true);
      let finalUrl = result.url;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          title: result.title || finalUrl,
          url: finalUrl,
          description: result.snippet,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      
      toast.success('Bookmark saved');
      setBookmarks(prev => [data.data, ...prev]);
    } catch (err: any) {
      console.error('Bookmark save error:', err);
      toast.error(err.message || 'Failed to save bookmark');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/bookmarks/${id}?user_id=${user?.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete bookmark');
      toast.success('Bookmark removed');
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Search & Add Custom Bookmark */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-xl">
            
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" /> Add Custom Bookmark
            </h2>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleSaveBookmark({
                    title: formData.get('title') as string,
                    url: formData.get('url') as string,
                    snippet: formData.get('description') as string,
                  });
                  e.currentTarget.reset();
                }}
                className="flex flex-col gap-4"
              >
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Website URL *</label>
                  <input
                    type="url"
                    name="url"
                    required
                    placeholder="https://example.com"
                    className="w-full bg-[#1a2133] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-gray-600 outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Title (Optional)</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="My Awesome Website"
                    className="w-full bg-[#1a2133] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-gray-600 outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Description (Optional)</label>
                  <textarea
                    name="description"
                    placeholder="Add a quick note about this site..."
                    className="w-full bg-[#1a2133] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-gray-600 outline-none focus:border-blue-500/50 transition-all resize-none h-20"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all mt-2 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 
                  {saving ? 'Saving...' : 'Save Custom Bookmark'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Saved Bookmarks */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-xl min-h-[500px]">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-400" /> Saved Bookmarks
            </h2>
            
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Globe className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">No bookmarks saved yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="p-4 bg-white/5 border border-white/10 rounded-xl group relative hover:border-blue-500/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded bg-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {bookmark.favicon ? (
                          <img 
                            src={bookmark.favicon} 
                            alt="" 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <Globe className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a 
                          href={bookmark.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-semibold text-sm text-white truncate block hover:text-blue-400 transition-colors mb-1"
                        >
                          {bookmark.title}
                        </a>
                        <p className="text-xs text-gray-400 line-clamp-2">{bookmark.description}</p>
                      </div>
                    </div>
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <a 
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-white/10 hover:bg-blue-500 text-white rounded-md transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button 
                        onClick={() => handleDelete(bookmark.id)}
                        className="p-1.5 bg-white/10 hover:bg-red-500 text-white rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
