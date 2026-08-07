'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Terminal, Database, AlertCircle, CheckCircle2, Loader2, Table2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SQLEditorPage() {
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const handleExecute = async () => {
    if (!query.trim()) {
      toast.error('Query cannot be empty');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setResults(null);
    setExecutionTime(null);

    const startTime = performance.now();

    try {
      const res = await fetch('/api/admin/sql-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));

      if (!res.ok) {
        throw new Error(data.error || 'Execution failed');
      }

      // data.data could be an array of objects (from SELECT) or an object with a message (from UPDATE/INSERT)
      if (Array.isArray(data.data)) {
        setResults(data.data);
      } else if (data.data?.status === 'success') {
        toast.success(data.data.message || 'Query executed successfully');
        setResults([]); // Empty array signifies success but no data to display in table
      } else if (typeof data.data === 'string') {
        try {
          const parsed = JSON.parse(data.data);
          if (Array.isArray(parsed)) setResults(parsed);
          else if (parsed.status === 'success') setResults([]);
          else setResults([parsed]);
        } catch {
          setResults([]);
        }
      } else {
        setResults(data.data ? [data.data] : []);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('SQL Execution Error');
    } finally {
      setIsExecuting(false);
    }
  };

  // Helper to extract column headers dynamically
  const getColumns = () => {
    if (!results || results.length === 0) return [];
    // If it's an array of objects, take the keys of the first object
    const firstRow = results[0];
    if (typeof firstRow === 'object' && firstRow !== null) {
      return Object.keys(firstRow);
    }
    return ['Result'];
  };

  const columns = getColumns();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
          <Database className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            Supabase SQL Editor
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-mono uppercase tracking-widest">Super Admin Only</span>
          </h1>
          <p className="text-slate-400">Direct database access via highly restricted RPC.</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
        <div className="bg-slate-950 flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal className="w-4 h-4" />
            <span className="text-sm font-mono tracking-wider">Query Console</span>
          </div>
          <Button 
            onClick={handleExecute} 
            disabled={isExecuting}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]"
          >
            {isExecuting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Run Query (F5)
          </Button>
        </div>
        
        <div className="relative group">
          {/* Line numbers mock */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-950 border-r border-slate-800 flex flex-col text-right pr-3 pt-4 text-slate-600 font-mono text-sm pointer-events-none select-none">
            {query.split('\n').map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'F5' || (e.ctrlKey && e.key === 'Enter')) {
                e.preventDefault();
                handleExecute();
              }
            }}
            spellCheck={false}
            className="w-full h-64 bg-slate-900 text-cyan-300 font-mono text-sm p-4 pl-16 focus:outline-none resize-y selection:bg-purple-500/30 leading-relaxed"
            placeholder="Enter SQL query here..."
          />
        </div>
      </Card>

      {/* Error Output */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 flex gap-3 animate-in fade-in zoom-in-95 duration-200">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="font-mono text-sm">
            <h3 className="text-red-400 font-bold mb-1">Execution Error</h3>
            <p className="text-red-300 whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}

      {/* Results Output */}
      {results && (
        <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-slate-950 flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Table2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold">Query Results</span>
              {results.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
                  {results.length} row{results.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Executed in {executionTime}ms
            </div>
          </div>

          <div className="p-0 overflow-x-auto">
            {results.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-sm">
                Query executed successfully, but returned 0 rows.
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-900/50 text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={idx} className="px-4 py-3 font-medium border-r border-slate-800/50 last:border-0">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {results.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-800/30 transition-colors">
                      {columns.map((col, colIdx) => {
                        const val = row[col];
                        const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? 'NULL');
                        const isNull = val === null || val === undefined;
                        return (
                          <td key={colIdx} className={`px-4 py-2 font-mono text-xs border-r border-slate-800/50 last:border-0 ${isNull ? 'text-slate-600 italic' : 'text-slate-300'}`}>
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
