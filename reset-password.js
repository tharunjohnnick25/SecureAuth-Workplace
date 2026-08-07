import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), '.data', 'mock-employees.json');
const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));

for (const emp of data) {
  if (emp.email === 'prashant@tcs.com') {
    // This is the hash for "Welcome@123" used by the other mock users
    emp.password_hash = "2ef9129c5dd88be49e7b7941c624e02c:06b516a91e20f2c3d011be968d769bb5d34a1315ecb29df86d605e49507d784af8627e0b23ec2ec64a652a57aabe3fd4015402b2fec4c8a2ed421c6a337a189b";
  }
}

writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log('Reset password to Welcome@123');
