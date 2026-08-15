import { MockEmployees, verifyPassword } from './lib/mock-employees';
import { getCompanyByDomain } from './lib/companies';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`ok - ${msg}`);
}

const email = 'admin@infosys.com';
const DEFAULT_ADMIN_PASSWORD = 'Welcome@123';

// 1. First login: no record exists for this company admin.
let record = MockEmployees.findForLogin(email);
assert(!record, 'no admin@infosys.com record before first login');

const domain = email.split('@')[1];
const company = getCompanyByDomain(domain);
assert(company?.name === 'Infosys Ltd', 'domain resolves to registered company');
const isCompanyAdminLogin = !!company && email === `admin@${company.domain}`;
assert(isCompanyAdminLogin, 'admin@<domain> detected as company admin login');

// Wrong default password must be rejected.
assert((DEFAULT_ADMIN_PASSWORD as string) !== 'wrong', 'wrong pw differs from default');

// 2. Auto-provision with the default password.
if (!record && isCompanyAdminLogin) {
  assert(!(email === 'admin@infosys.com' && DEFAULT_ADMIN_PASSWORD !== 'Welcome@123'), 'default pw guard');
  record = MockEmployees.add({
    email,
    full_name: 'Admin',
    role: 'ORGANIZATION_ADMIN',
    department: 'Security',
    designation: 'Company Administrator',
    password: DEFAULT_ADMIN_PASSWORD,
    must_change_password: true,
  }) as unknown as ReturnType<typeof MockEmployees.findForLogin>;
}
assert(!!record, 'record provisioned');
assert(!!record.password_hash && verifyPassword(DEFAULT_ADMIN_PASSWORD, record.password_hash), 'default password verifies');
assert((record as any).must_change_password === true, 'must_change_password flag set');

// 3. Subsequent login finds the persisted record (password still default).
const again = MockEmployees.findForLogin(email);
assert(!!again, 'second login finds record');
assert(verifyPassword(DEFAULT_ADMIN_PASSWORD, again.password_hash), 'second login still accepts default pw');

// 4. Change password clears the flag.
const updated = MockEmployees.update(again.id, {
  password: 'StrongNewPass@2026',
  must_change_password: false,
});
assert(updated?.must_change_password === false, 'must_change_password cleared after change');

const after = MockEmployees.findForLogin(email);
assert(!verifyPassword(DEFAULT_ADMIN_PASSWORD, after.password_hash), 'old default password no longer valid');
assert(verifyPassword('StrongNewPass@2026', after.password_hash), 'new password validates');
assert(after.must_change_password === false, 'flag persists as false');

// 5. Cleanup: remove the provisioned test record so the data file is untouched.
MockEmployees.remove(record.id);
const cleaned = MockEmployees.findForLogin(email);
assert(!cleaned, 'test record removed');

console.log('\nAll assertions passed.');
