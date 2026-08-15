const fs = require('fs');
const filePath = 'd:/Downloads/IAM Cybersecurity Authentication Systems/app/leaves/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\{'[^']+'\s*\|\|\s*'([^']+)'\}/g, "'$1'");
fs.writeFileSync(filePath, content);
console.log('Fixed leaves page');
