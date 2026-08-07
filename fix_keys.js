const fs = require('fs');

const contextPath = 'context/LanguageContext.tsx';
let content = fs.readFileSync(contextPath, 'utf8');

// The keys were injected like:     30minutes_31: '30 minutes',
// We need to change it to:     '30minutes_31': '30 minutes',

content = content.replace(/^(\s+)([a-zA-Z0-9_]+): /gm, "$1'$2': ");

fs.writeFileSync(contextPath, content, 'utf8');
console.log('Fixed keys in LanguageContext.tsx');
