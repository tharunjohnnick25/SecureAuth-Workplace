const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  content = content.replace(/\{?t\('([a-zA-Z]+)_[0-9]+'\)\}?/g, (match, word, offset, string) => {
    changed = true;
    let split = word.replace(/([a-z])([A-Z])/g, '$1 $2');
    split = split.toLowerCase();
    split = split.charAt(0).toUpperCase() + split.slice(1);
    
    // If it was wrapped in { }, it was likely a React node or prop.
    // However, if we just replace the whole {t('...')} with '...' it might break if it's a JSX node: <h1>'...'</h1>
    // Actually, in JSX, <h1>{'Text'}</h1> is valid and clean.
    // Wait! The regex matches `{t(...)` or `t(...)`.
    // Let's just keep the `{` and `}` if they exist, or replace them?
    // It's safer to just replace `t('Word_123')` with `'Word'` and leave `{` and `}` alone,
    // so `{t('Word_123')}` becomes `{'Word'}`, which is perfectly valid JSX!
    return match; // We'll do it differently
  });

  // Safe replacement:
  content = content.replace(/t\('([a-zA-Z]+)_[0-9]+'\)/g, (match, word) => {
    changed = true;
    let split = word.replace(/([a-z])([A-Z])/g, '$1 $2');
    split = split.toLowerCase();
    split = split.charAt(0).toUpperCase() + split.slice(1);
    return `'${split}'`;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      processFile(full);
    }
  }
}

walk('app');
walk('components');
console.log('Done!');
