'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Terminal, Play, Loader2, Clock, CheckCircle2, XCircle, Settings2, Copy, Check } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useLanguage } from "@/context/LanguageContext";
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

const CODE_TEMPLATES: Record<string, string> = {
  python: 'print("Hello from SecureAuth Workplace!")\n',
  javascript: 'console.log("Hello from SecureAuth Workplace!");\n',
  typescript: 'console.log("Hello from SecureAuth Workplace!");\n',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from SecureAuth Workplace!");\n  }\n}\n',
  cpp: '#include <iostream>\nint main() {\n  std::cout << "Hello from SecureAuth Workplace!" << std::endl;\n  return 0;\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello from SecureAuth Workplace!")\n}\n',
  rust: 'fn main() {\n    println!("Hello from SecureAuth Workplace!");\n}\n',
};

const DEFAULT_LANGUAGES = [
  { language: 'python', version: '' },
  { language: 'javascript', version: '' },
  { language: 'typescript', version: '' },
  { language: 'java', version: '' },
  { language: 'cpp', version: '' },
  { language: 'go', version: '' },
  { language: 'rust', version: '' },
];

const COMPILER_STORAGE_KEY = 'secureauth-compiler-state';

interface CompilerPersistedState {
  language?: string;
  code?: string;
  stdin?: string;
}

function loadPersistedState(): CompilerPersistedState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(COMPILER_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CompilerPersistedState;
  } catch {
    return {};
  }
}

export default function CompilerPage() {
  const { t } = useLanguage();
  const [runtimes, setRuntimes] = useState<{ language: string; version: string }[]>([]);
  const [language, setLanguage] = useState(() => loadPersistedState().language || 'python');
  const [code, setCode] = useState(() => {
    const saved = loadPersistedState();
    return saved.code || CODE_TEMPLATES[saved.language || 'python'] || CODE_TEMPLATES.python;
  });
  const [stdin, setStdin] = useState(() => loadPersistedState().stdin || '');
  const [runOutput, setRunOutput] = useState<{ stdout?: string; stderr?: string; status?: string; runtime_ms?: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [activeTab, setActiveTab] = useState<'TESTCASE' | 'RESULT'>('TESTCASE');
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  useEffect(() => {
    loadRuntimes();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        COMPILER_STORAGE_KEY,
        JSON.stringify({ language, code, stdin } satisfies CompilerPersistedState)
      );
    } catch {}
  }, [language, code, stdin]);

  const loadRuntimes = async () => {
    try {
      const res = await fetch('/api/piston');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRuntimes(data.data);
      }
    } catch {
      // Runtimes unavailable — the UI falls back to DEFAULT_LANGUAGES.
    }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(CODE_TEMPLATES[lang] || CODE_TEMPLATES.python);
  };

  const handleRunCode = async () => {
    setRunning(true);
    setActiveTab('RESULT');
    setRunOutput(null);
    try {
      const res = await fetch('/api/piston', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          version: runtimes.find(r => r.language === language)?.version,
          code,
          stdin: stdin || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Execution failed');
      setRunOutput({
        stdout: data.data?.run?.stdout || '',
        stderr: data.data?.run?.stderr || '',
        status: data.status || (data.data?.run?.code === 0 ? 'COMPILED' : 'ERROR'),
        runtime_ms: data.data?.runtime_ms,
      });
    } catch (err: any) {
      setRunOutput({ stdout: '', stderr: err.message || 'Execution failed', status: 'ERROR' });
    } finally {
      setRunning(false);
    }
  };

  const handleAutoFix = async () => {
    if (!runOutput?.stderr) return;
    setIsFixing(true);
    try {
      const res = await fetch('/api/ai/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code, error: runOutput.stderr }),
      });
      const data = await res.json();
      if (data.success && data.data?.fixedCode) {
        setCode(data.data.fixedCode);
        setRunOutput({ ...runOutput, stderr: runOutput.stderr + '\n\n✨ AI Auto-Fix Applied successfully! Click Run Code to test your new code.' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden flex">
      <Sidebar />
      <div className="lg:ml-64 flex-1 flex flex-col h-screen">
        <Navbar />
        <main className="flex-1 flex flex-col pt-16 overflow-hidden bg-[#0a0a0a]">
          {/* Top Toolbar */}
          <div className="h-14 border-b border-white/5 bg-[#111111] flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-wider">
                <Terminal className="w-5 h-5" />
                <span>IDE</span>
              </div>
              <div className="h-6 w-px bg-white/10 mx-2"></div>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-md px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:border-white/20 focus:outline-none transition-colors cursor-pointer"
              >
                {(runtimes.length > 0 ? runtimes : DEFAULT_LANGUAGES).map((r) => (
                  <option key={r.language} value={r.language}>{r.language.charAt(0).toUpperCase() + r.language.slice(1)}</option>
                ))}
              </select>
            </div>
            
            <Button 
              onClick={handleRunCode} 
              disabled={running} 
              className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-md px-6 shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all"
            >
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              {running ? 'Running...' : 'Run Code'}
            </Button>
          </div>

          {/* Resizable Layout */}
          <div className="flex-1 min-h-0">
            <PanelGroup direction="horizontal">
              <Panel defaultSize={60} minSize={30} className="flex flex-col">
                <div className="h-8 border-b border-white/5 bg-[#1a1a1a] flex items-center px-4 shrink-0">
                  <span className="text-xs text-gray-400 font-medium tracking-wide">main.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : language === 'go' ? 'go' : language === 'rust' ? 'rs' : 'txt'}</span>
                </div>
                <div className="flex-1">
                  <Editor
                    height="100%"
                    language={language}
                    theme="vs-dark"
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      padding: { top: 16, bottom: 16 },
                      smoothScrolling: true,
                      cursorBlinking: "smooth",
                      cursorSmoothCaretAnimation: "on",
                      formatOnPaste: true,
                    }}
                    loading={
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Editor...
                      </div>
                    }
                  />
                </div>
              </Panel>

              <PanelResizeHandle className="w-1.5 bg-white/5 hover:bg-emerald-500/50 transition-colors cursor-col-resize z-10" />

              <Panel defaultSize={40} minSize={25} className="flex flex-col bg-[#111111]">
                <div className="flex h-10 border-b border-white/5 bg-[#1a1a1a] shrink-0">
                  <button
                    onClick={() => setActiveTab('TESTCASE')}
                    className={`flex items-center gap-2 px-6 h-full text-sm font-medium transition-colors relative ${
                      activeTab === 'TESTCASE' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Settings2 className="w-4 h-4" />
                    Testcase
                    {activeTab === 'TESTCASE' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('RESULT')}
                    className={`flex items-center gap-2 px-6 h-full text-sm font-medium transition-colors relative ${
                      activeTab === 'RESULT' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Terminal className="w-4 h-4" />
                    Test Result
                    {activeTab === 'RESULT' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full"></div>
                    )}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {activeTab === 'TESTCASE' && (
                    <div className="h-full flex flex-col animate-in fade-in duration-200">
                      <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Standard Input (stdin)</label>
                      <textarea
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/5 rounded-lg p-4 text-gray-300 text-sm font-mono focus:outline-none focus:border-emerald-500/50 resize-none w-full shadow-inner"
                        placeholder="Paste test case input here..."
                        spellCheck={false}
                      />
                    </div>
                  )}

                  {activeTab === 'RESULT' && (
                    <div className="animate-in fade-in duration-200">
                      {!runOutput && !running && (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
                          <Terminal className="w-8 h-8 opacity-50" />
                          <p className="text-sm">Run your code to see results here</p>
                        </div>
                      )}
                      
                      {running && (
                        <div className="flex flex-col items-center justify-center h-48 text-emerald-500 gap-3">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <p className="text-sm animate-pulse">Evaluating solution...</p>
                        </div>
                      )}

                      {runOutput && !running && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-6 pb-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                              {runOutput.status === 'COMPILED' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <span className={`text-xl font-bold ${runOutput.status === 'COMPILED' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {runOutput.status === 'COMPILED' ? 'Accepted' : runOutput.status === 'TIMEOUT' ? 'Time Limit Exceeded' : 'Runtime Error'}
                              </span>
                            </div>
                            
                            {runOutput.runtime_ms !== undefined && (
                              <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full">
                                <Clock className="w-4 h-4" />
                                Runtime: <span className="text-white font-mono">{runOutput.runtime_ms} ms</span>
                              </div>
                            )}
                          </div>

                          {runOutput.stdout && (
                            <div className="relative group">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stdout</label>
                                <button 
                                  onClick={() => handleCopy(runOutput.stdout || '', 'stdout')}
                                  className="text-gray-500 hover:text-white transition-colors"
                                  title="Copy Output"
                                >
                                  {copiedStates['stdout'] ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                              </div>
                              <div data-copy-allowed className="bg-black/60 rounded-lg p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap border border-white/5 shadow-inner">
                                {runOutput.stdout}
                              </div>
                            </div>
                          )}

                          {runOutput.stderr && (
                            <div className="relative group mt-6">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stderr</label>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={handleAutoFix}
                                    disabled={isFixing}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                                  >
                                    {isFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>✨</span>}
                                    {isFixing ? 'Fixing...' : 'Auto-Fix Code'}
                                  </button>
                                  <button 
                                    onClick={() => handleCopy(runOutput.stderr || '', 'stderr')}
                                    className="text-red-400/70 hover:text-red-400 transition-colors p-1"
                                    title="Copy Error"
                                  >
                                    {copiedStates['stderr'] ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                              <div data-copy-allowed className="bg-red-500/10 rounded-lg p-4 font-mono text-sm text-red-400 whitespace-pre-wrap border border-red-500/20 shadow-inner">
                                {runOutput.stderr}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Panel>
            </PanelGroup>
          </div>
        </main>
      </div>
    </div>
  );
}
