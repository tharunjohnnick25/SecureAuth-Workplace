const fs = require('fs');

const contextPath = 'context/LanguageContext.tsx';
let content = fs.readFileSync(contextPath, 'utf8');
const newKeys = JSON.parse(fs.readFileSync('extracted_translations.json', 'utf8'));

// We need to inject these keys into each language block in LanguageContext.tsx
const langs = ['en', 'hi', 'es', 'fr', 'de', 'ta'];

for (const lang of langs) {
  let injectionStr = '';
  for (const [key, value] of Object.entries(newKeys)) {
    // Escape single quotes and newlines in value
    const escapedValue = value.replace(/'/g, "\\'").replace(/\r?\n/g, "\\n");
    injectionStr += `    '${key}': '${escapedValue}',\n`;
  }
  
  // Regex to find the start of the language block
  const regex = new RegExp(`(${lang}: \\{[\\s\\S]*?)(  \\},)`, 'g');
  content = content.replace(regex, `$1${injectionStr}$2`);
}

fs.writeFileSync(contextPath, content, 'utf8');
console.log('Successfully injected new keys into LanguageContext.tsx');
