'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, Globe, Search, Plus, ExternalLink, Trash2, Bookmark } from 'lucide-react';
import { toast } from 'sonner';

export default function BookmarksPage() {
  const { user } = useAuthStore();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'custom' | 'search'>('custom');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (user) loadBookmarks();
  }, [user]);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookmarks?user_id=${user?.id}`);
      const data = await res.json();
      if (data.success) setBookmarks(data.data);
    } catch (e) {
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch (e) {
      toast.error('Failed to fetch search results');
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleSaveBookmark = async (result: any) => {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          title: result.title,
          url: result.url,
          description: result.snippet,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Bookmark saved');
      loadBookmarks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bookmark');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/bookmarks/${id}?user_id=${user?.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete bookmark');
      toast.success('Bookmark removed');
      loadBookmarks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 p-4 sm:p-6 lg:p-8 min-h-screen">
          
          <div className="mb-8 pt-4">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Globe className="w-5 h-5" />
              </div>
              Web Bookmarks
            </h1>
            <p className="text-gray-400 text-sm">Search the web and manage your frequently visited sites.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Search & Add Custom Bookmark */}
            <div className="flex flex-col gap-6">
              <div className="bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-xl">
                
                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/10 mb-6 pb-2">
                  <button 
                    onClick={() => setActiveTab('custom')} 
                    className={`pb-2 text-sm font-bold transition-all relative ${activeTab === 'custom' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Add Custom URL
                    {activeTab === 'custom' && <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.8)]" />}
                  </button>
                  <button 
                    onClick={() => setActiveTab('search')} 
                    className={`pb-2 text-sm font-bold transition-all relative ${activeTab === 'search' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Search Web
                    {activeTab === 'search' && <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.8)]" />}
                  </button>
                </div>

                {activeTab === 'custom' ? (
                  /* Add Custom URL Form */
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
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all mt-2 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Save Custom Bookmark
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Web Search Form */
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <form onSubmit={handleSearch} className="relative mb-6">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search simulated web..."
                        className="w-full bg-[#1a2133] border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500/50 transition-all"
                      />
                      <button 
                        type="submit"
                        disabled={isSearchLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isSearchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </button>
                    </form>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {!hasSearched ? (
                        <div className="text-center py-10 text-gray-500 text-sm">
                          Enter a query to search the simulated web
                        </div>
                      ) : searchResults.length === 0 && !isSearchLoading ? (
                        <div className="text-center py-10 text-gray-500 text-sm">
                          No results found
                        </div>
                      ) : (
                        searchResults.map((result, idx) => {
                          const isSaved = bookmarks.some(b => b.url === result.url);
                          return (
                            <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-400 mb-1 truncate">{result.displayUrl}</p>
                                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold text-base mb-1 block hover:underline truncate">
                                    {result.title}
                                  </a>
                                  <p className="text-sm text-gray-300 line-clamp-2">{result.snippet}</p>
                                </div>
                                <button
                                  onClick={() => handleSaveBookmark(result)}
                                  disabled={isSaved}
                                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isSaved ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-blue-500 hover:text-white text-gray-400'}`}
                                  title={isSaved ? 'Already saved' : 'Save Bookmark'}
                                >
                                  {isSaved ? <Bookmark className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
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
                          <img 
                            src={bookmark.favicon} 
                            alt="" 
                            className="w-8 h-8 rounded bg-white/10 p-1 flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
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
        </main>
      </div>
    </div>
  );
}
