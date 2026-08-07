const fs = require('fs');
const path = require('path');
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      let content = fs.readFileSync(full, 'utf8');
      if (content.includes('DashboardHeader')) {
        content = content.replace(/import\s+\{\s*DashboardHeader\s*\}\s+from\s+['\"].*?DashboardHeader['\"];/g, 'import { PageHeader } from \'@/components/PageHeader\';');
        content = content.replace(/<DashboardHeader/g, '<PageHeader');
        content = content.replace(/<\/DashboardHeader>/g, '</PageHeader>');
        fs.writeFileSync(full, content, 'utf8');
        console.log('Updated', full);
      }
    }
  }
}
walk('app');
walk('components');
