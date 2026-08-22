const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'supabase', 'clean_schema_combined.sql');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/CREATE POLICY\s+"([^"]+)"\s+ON\s+([^\s]+)/gi, (match, p1, p2) => {
    if (p2.includes('%I')) return match; // skip format string specifiers in pl/pgsql
    return `DROP POLICY IF EXISTS "${p1}" ON ${p2};\nCREATE POLICY "${p1}" ON ${p2}`;
});

fs.writeFileSync(file, content);
console.log('Fixed policies in clean_schema_combined.sql');
