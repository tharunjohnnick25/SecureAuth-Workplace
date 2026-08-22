const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('app/api');
let count = 0;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('company_id')) {
        content = content.replace(/company_id/g, 'org_id');
        fs.writeFileSync(file, content, 'utf8');
        console.log('Reverted:', file);
        count++;
    }
}
console.log('Total files reverted:', count);
