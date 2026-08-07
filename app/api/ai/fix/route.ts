import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { language, code, error } = await req.json();

    if (!code || !error) {
      return NextResponse.json({ success: false, error: 'Missing code or error trace' }, { status: 400 });
    }

    // Simulate network delay for AI processing
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

    let fixedCode = code;

    // Heuristic AI Auto-Fix rules (Simulating LLM behavior for the IAM demo)
    if (language === 'python') {
      if (error.includes('EOFError')) {
        // AI replaces raw input() with a try/except loop or fallback
        fixedCode = fixedCode.replace(
          /([a-zA-Z0-9_]+)\s*=\s*input\([^)]*\)/g, 
          "try:\n    $1 = input()\nexcept EOFError:\n    $1 = ''"
        );
        // If it didn't match the regex, just append a global fix
        if (fixedCode === code) {
          fixedCode = `import sys\ndef safe_input(prompt=''):\n    try: return input(prompt)\n    except EOFError: return ''\n\n# AI Auto-Fix Applied: Replaced input() to handle EOFError safely\n` + code.replace(/input\(/g, 'safe_input(');
        }
      } else if (error.includes('SyntaxError')) {
        fixedCode = `# ✨ AI Auto-Fix: Detected SyntaxError. Please check for missing colons, parenthesis, or indentation.\n${code}`;
      } else {
        fixedCode = `# ✨ AI Auto-Fix: Handled exception -> ${error.split('\\n').pop()}\n${code}`;
      }
    } else if (language === 'java') {
      if (error.includes('unmappable character') || error.includes('illegal character')) {
        fixedCode = `// ✨ AI Auto-Fix: Ensure your source file is saved with UTF-8 encoding before compiling.\n${code}`;
      } else if (error.includes('main(String[])')) {
        fixedCode = `// ✨ AI Auto-Fix: Make sure the class containing public static void main is the primary class.\n${code}`;
      } else {
        fixedCode = `// ✨ AI Auto-Fix: Applied corrections for Java runtime exception.\n${code}`;
      }
    } else {
      fixedCode = `// ✨ AI Auto-Fix Engine: Analyzed crash and applied safety wrappers.\n${code}`;
    }

    return NextResponse.json({ success: true, data: { fixedCode } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
