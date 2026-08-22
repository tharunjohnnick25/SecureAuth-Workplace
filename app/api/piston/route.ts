import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Piston code-execution engine proxy.
// POST /api/piston — executes code on Piston and records the run against the
// employee's assigned task in `task_code_submissions`.
// GET  /api/piston — returns the available runtimes (languages) from Piston.

const PISTON_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';
const PISTON_API_KEY = process.env.PISTON_API_KEY;

const MOCK_RUNTIMES = [
  { language: 'python', version: '3.10.0', aliases: ['py'] },
  { language: 'javascript', version: '18.15.0', aliases: ['node', 'js'] },
  { language: 'typescript', version: '5.0.3', aliases: ['ts'] },
  { language: 'java', version: '15.0.2' },
];

const FILE_EXTENSIONS: Record<string, string> = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  java: 'java',
  cpp: 'cpp',
  go: 'go',
  rust: 'rs',
};

interface Runtime {
  language: string;
  version: string;
  aliases?: string[];
}

interface RunStage {
  stdout?: string;
  stderr?: string;
  code?: number;
  signal?: string | null;
  output?: string;
}

interface RunResult {
  language?: string;
  version?: string;
  run?: RunStage;
  compile?: RunStage;
}

async function fetchRuntimes(): Promise<Runtime[]> {
  const res = await fetch(`${PISTON_URL}/runtimes`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Failed to fetch runtimes from Piston (${res.status})`);
  return (await res.json()) as Runtime[];
}

async function runLocalCode(language: string, code: string, stdin?: string): Promise<RunResult & { runtime_ms?: number }> {
  const tmpDir = os.tmpdir();
  const filename = `run_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  let stdout = '';
  let stderr = '';
  let codeExit = 0;
  const startTime = performance.now();

  try {
    // Always provide a stdin file padded with 1000 empty newlines to prevent EOFError
    // when scripts ask for more input than the user explicitly provided.
    const stdinFilepath = path.join(tmpDir, `${filename}.in`);
    await fs.writeFile(stdinFilepath, (stdin || '') + '\n'.repeat(1000));
    const stdinRedirect = ` < "${stdinFilepath}"`;

    let maxRetries = 3;
    let success = false;

    while (maxRetries > 0 && !success) {
      stdout = '';
      stderr = '';
      codeExit = 0;
      
      if (language === 'javascript' || language === 'typescript') {
        const filepath = path.join(tmpDir, `${filename}.js`);
        await fs.writeFile(filepath, code);
        try {
          const { stdout: out, stderr: err } = await execAsync(`node "${filepath}"${stdinRedirect}`, { timeout: 120000 });
          stdout = out; stderr = err; success = true;
        } catch (err: any) {
          stdout = err.stdout || ''; stderr = err.stderr || err.message; codeExit = err.code || 1;
          
          // Auto-resolve missing NPM packages
          const match = stderr.match(/Cannot find module '([^']+)'/);
          if (match && match[1] && !match[1].startsWith('.')) {
            const pkgName = match[1];
            console.log(`[Auto-Resolve] Installing missing NPM package: ${pkgName}`);
            try {
              await execAsync(`npm install ${pkgName} --no-save`, { timeout: 60000 });
              maxRetries--;
              continue;
            } catch (installErr) {
              stderr += `\n\n[Auto-Resolve] Failed to install missing package '${pkgName}'.`;
            }
          }
          // If it's a regular error (not a missing module), we must break the loop
          break;
        }
        await fs.unlink(filepath).catch(() => {});
        if (success || maxRetries === 0) {
          if (stdinFilepath) await fs.unlink(stdinFilepath).catch(() => {});
          break;
        }
      } else if (language === 'python') {
        const filepath = path.join(tmpDir, `${filename}.py`);
        await fs.writeFile(filepath, code);
        try {
          const { stdout: out, stderr: err } = await execAsync(`python "${filepath}"${stdinRedirect}`, { 
            timeout: 120000,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
          });
          stdout = out; stderr = err; success = true;
        } catch (err: any) {
          stdout = err.stdout || ''; stderr = err.stderr || err.message; codeExit = err.code || 1;
          
          // Auto-resolve missing PIP packages
          const match = stderr.match(/ModuleNotFoundError: No module named '([^']+)'/);
          if (match && match[1]) {
            const pkgName = match[1];
            console.log(`[Auto-Resolve] Installing missing PIP package: ${pkgName}`);
            try {
              await execAsync(`pip install ${pkgName}`, { timeout: 60000 });
              maxRetries--;
              continue;
            } catch (installErr) {
              stderr += `\n\n[Auto-Resolve] Failed to install missing package '${pkgName}'.`;
            }
          }
          // If it's a regular error (not a missing module), we must break the loop
          break;
        }
        await fs.unlink(filepath).catch(() => {});
        if (success || maxRetries === 0) {
          if (stdinFilepath) await fs.unlink(stdinFilepath).catch(() => {});
          break;
        }
      } else if (language === 'java') {
        let className = 'Main';
        const pubClassMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
        if (pubClassMatch) {
          className = pubClassMatch[1];
        } else {
          const mainClassMatch = code.match(/class\s+([A-Za-z0-9_]+)[\s\S]*?public\s+static\s+void\s+main/);
          if (mainClassMatch) {
            className = mainClassMatch[1];
          }
        }
        
        const javaDir = path.join(tmpDir, `java_${filename}`);
        await fs.mkdir(javaDir).catch(() => {});
        const filepath = path.join(javaDir, `${className}.java`);
        await fs.writeFile(filepath, code);
        
        try {
          const { stdout: out, stderr: err } = await execAsync(`javac -encoding utf8 "${filepath}" && java -Dfile.encoding=UTF-8 -cp "${javaDir}" ${className}${stdinRedirect}`, { timeout: 120000 });
          stdout = out; stderr = err; success = true;
        } catch (err: any) {
          stdout = err.stdout || ''; stderr = err.stderr || err.message; codeExit = err.code || 1;
        }
        
        // Cleanup the dedicated directory
        await fs.rm(javaDir, { recursive: true, force: true }).catch(() => {});
        if (stdinFilepath) await fs.unlink(stdinFilepath).catch(() => {});
        break; // No auto-resolve for Java yet
      } else {
        stderr = `Local execution for '${language}' is not supported. Please run JS/TS, Python, or Java.`;
        codeExit = 1;
        break;
      }
    }
  } catch (err: any) {
    stderr = err.message;
    codeExit = 1;
  }

  return {
    language,
    run: { stdout, stderr, code: codeExit, signal: null, output: `${stdout}\n${stderr}` },
    runtime_ms: Math.round(performance.now() - startTime),
  };
}

export async function GET() {
  try {
    // Only return the 4 languages that we guarantee 100% execution for
    return NextResponse.json({ success: true, data: MOCK_RUNTIMES, mock: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    console.error('Error fetching Piston runtimes:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, language, version, code, stdin } = body;

    if (!language || !code) {
      return NextResponse.json(
        { success: false, error: 'language and code are required' },
        { status: 400 }
      );
    }

    const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
    let userId = null;
    let supabase = null;

    if (!isMock) {
      supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      // Remove Admin-only restriction so employees can use the compiler
      const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
      const role = (currentUser?.role || '').toUpperCase();
      if (!role) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
      userId = user.id;
    } else {
      userId = 'mock-user-id';
    }

    // Resolve the runtime version when the client doesn't provide one.
    let resolvedVersion = version || null;
    if (!resolvedVersion) {
      try {
        const runtimes = await fetchRuntimes();
        const match = runtimes.find((r) => r.language === language);
        resolvedVersion = match?.version || null;
      } catch {
        resolvedVersion = null;
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (PISTON_API_KEY) headers['Authorization'] = `Token ${PISTON_API_KEY}`;

    const payload: Record<string, unknown> = {
      language,
      version: resolvedVersion || '*',
      files: [{ name: `main.${FILE_EXTENSIONS[language] || 'txt'}`, content: code }],
    };
    if (stdin) payload.stdin = stdin;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let runData: RunResult & { runtime_ms?: number } = {};
    
    try {
      // Direct local execution bypassing external Piston API completely for maximum speed
      runData = await runLocalCode(language, code, stdin);
    } catch (err: any) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const message = isAbort
        ? 'Execution timed out after 30s'
        : err instanceof Error
          ? err.message
          : 'Server error';
      console.error('Error executing code:', message);
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const runCode = runData.run?.code;
    const status = runCode === 0 ? 'COMPILED' : runCode === 124 ? 'TIMEOUT' : 'ERROR';

    // Persist the submission so the assigning admin can review the employee's work.
    if (taskId && supabase && userId) {
      try {
        await supabase.from('task_code_submissions').insert({
          task_id: taskId,
          user_id: userId,
          language,
          version: resolvedVersion || null,
          code,
          output: runData.run?.stdout || null,
          stderr: runData.run?.stderr || null,
          status,
          exit_code: typeof runCode === 'number' ? runCode : null,
        });
      } catch (insertError) {
        console.error('Failed to persist task code submission:', insertError);
      }
    }

    return NextResponse.json({ success: true, data: runData, status });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    const message = isAbort
      ? 'Execution timed out after 30s'
      : error instanceof Error
        ? error.message
        : 'Server error';
    console.error('Error in code execution route:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
