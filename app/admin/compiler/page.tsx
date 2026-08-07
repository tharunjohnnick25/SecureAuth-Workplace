'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Terminal, Play, Loader2 } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

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

export default function AdminCompilerPage() {
  const { t } = useLanguage();
  const [runtimes, setRuntimes] = useState<{ language: string; version: string }[]>([]);
  const [language, setLanguage] = useState(() => loadPersistedState().language || 'python');
  const [code, setCode] = useState(() => {
    const saved = loadPersistedState();
    return saved.code || CODE_TEMPLATES[saved.language || 'python'] || CODE_TEMPLATES.python;
  });
  const [stdin, setStdin] = useState(() => loadPersistedState().stdin || '');
  const [runOutput, setRunOutput] = useState<{ stdout?: string; stderr?: string; status?: string } | null>(null);
  const [running, setRunning] = useState(false);

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
      });
    } catch (err: any) {
      setRunOutput({ stdout: '', stderr: err.message || 'Execution failed', status: 'ERROR' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24 overflow-x-hidden">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 tracking-tight">Code Compiler</h1>
            <p className="text-gray-400">Execute code in multiple languages securely via Piston (admin only).</p>
          </div>

          <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-600/10 rounded-lg flex items-center justify-center border border-emerald-600/20">
                <Terminal className="text-emerald-400 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{'Code compiler' || 'Code Compiler'}</h2>
                <p className="text-sm text-gray-400">{'Execute codein ma' || 'Write and run code in Python, JavaScript, Java, C++, Go, Rust and more.'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-semibold text-gray-300">{'Language' || 'Language'}</label>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {(runtimes.length > 0 ? runtimes : DEFAULT_LANGUAGES).map((r) => (
                  <option key={r.language} value={r.language}>{r.language}</option>
                ))}
              </select>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-white text-sm font-mono leading-relaxed focus:outline-none focus:border-emerald-500 resize-y min-h-[260px]"
              placeholder="// Write code here..."
            />

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">{'Standard input' || 'Standard Input (optional)'}</label>
              <input
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                placeholder="e.g. 3"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              {runOutput && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  runOutput.status === 'COMPILED'
                    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    : 'text-red-400 bg-red-400/10 border-red-400/20'
                }`}>
                  {runOutput.status}
                </span>
              )}
              <Button onClick={handleRunCode} disabled={running} className="bg-emerald-600 hover:bg-emerald-700">
                {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                {running ? ('Running' || 'Running...') : ('Run code' || 'Run Code')}
              </Button>
            </div>

            {runOutput && (
              <div className="mt-4 rounded-xl bg-black/60 border border-white/10 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" /> Output
                </div>
                <pre className="p-4 text-sm font-mono text-emerald-300 whitespace-pre-wrap break-words max-h-72 overflow-y-auto">
                  {runOutput.stdout || '(no output)'}
                </pre>
                {runOutput.stderr && (
                  <pre className="px-4 pb-4 text-sm font-mono text-red-400 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {runOutput.stderr}
                  </pre>
                )}
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}
