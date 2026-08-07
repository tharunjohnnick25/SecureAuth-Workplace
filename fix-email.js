import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), '.data', 'mock-employees.json');
const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));

for (const emp of data) {
  if (emp.email === 'prrashanth@tcs.com') {
    emp.email = 'prashant@tcs.com';
    emp.full_name = 'Prashant';
  }
}

writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log('Fixed email typo');
