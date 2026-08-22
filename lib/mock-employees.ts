import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { isMockMode } from './mock-mode';

export { isMockMode };

export interface MockEmployee {
  id: string;
  employee_id?: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  department?: string;
  designation?: string;
  phone?: string;
  employment_type?: string;
  password?: string;
  password_hash?: string;
  passkey_enrolled?: boolean;
  passkeys_count?: number;
  face_verified?: boolean;
  face_embedding?: number[];
  totp_secret?: string;
  totp_enrolled?: boolean;
  consent_given?: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = String(stored || '').split(':');
    if (!salt || !key) return false;
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(key, 'hex');
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export const ADMIN_ROLES = new Set(['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN']);

export const validKeys: (keyof MockEmployee)[] = [
  'full_name', 'phone', 'department', 'designation', 'role', 
  'status', 'date_of_joining', 'date_of_birth', 'gender',
  'emergency_contact_name', 'emergency_contact_phone',
  'employment_type', 'manager_id', 'blood_group', 'marital_status',
  'nationality', 'city', 'state', 'country', 'postal_code', 'address',
  'totp_secret', 'totp_enrolled', 'consent_given', 'is_deleted'
];

export const REQUIRED_PROFILE_FIELDS = [
  'full_name',
  'phone',
  'department',
  'designation',
  'employment_type',
  'date_of_joining',
  'date_of_birth',
  'gender',
  'emergency_contact_name',
  'emergency_contact_phone',
] as const;

export function isProfileComplete(record: Record<string, unknown>): boolean {
  return REQUIRED_PROFILE_FIELDS.every((field) => {
    const value = record[field];
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
}

const DATA_DIR = join(process.cwd(), '.data');
const DATA_FILE = join(DATA_DIR, 'mock-employees.json');

const departments = ['Engineering', 'Product', 'Design', 'QA', 'HR', 'Sales', 'IT Support'];
const commonPasswordHash = hashPassword('Welcome@123');

const DEFAULT_EMPLOYEES: MockEmployee[] = [
  {
    id: 'admin-main',
    employee_id: 'EMP-ADMIN',
    full_name: 'Alice Admin',
    email: 'admin@enterprise.com',
    role: 'ADMIN',
    status: 'Active',
    department: 'Management',
    designation: 'System Administrator',
    employment_type: 'Full-time',
    password_hash: commonPasswordHash,
    created_at: new Date().toISOString(),
  }
];

departments.forEach((dept, idx) => {
  const managerId = `mgr-${idx}`;
  const deptPrefix = dept.substring(0, 3).toUpperCase();
  
  // Create Manager
  DEFAULT_EMPLOYEES.push({
    id: managerId,
    employee_id: `EMP-${deptPrefix}-MGR`,
    full_name: `${dept} Manager`,
    email: `manager.${dept.toLowerCase().replace(' ', '')}@enterprise.com`,
    role: 'MANAGER',
    status: 'Active',
    department: dept,
    designation: `${dept} Head`,
    employment_type: 'Full-time',
    password_hash: commonPasswordHash,
    created_at: new Date().toISOString(),
  });

  // Create 2 Employees per department
  for (let i = 1; i <= 2; i++) {
    DEFAULT_EMPLOYEES.push({
      id: `emp-${idx}-${i}`,
      employee_id: `EMP-${deptPrefix}-00${i}`,
      full_name: `${dept} Employee ${i}`,
      email: `employee${i}.${dept.toLowerCase().replace(' ', '')}@enterprise.com`,
      role: 'EMPLOYEE',
      status: 'Active',
      department: dept,
      designation: `${dept} Specialist`,
      manager_id: managerId,
      employment_type: 'Full-time',
      password_hash: commonPasswordHash,
      created_at: new Date().toISOString(),
    });
  }
});

function loadFromDisk(): MockEmployee[] {
  try {
    if (existsSync(DATA_FILE)) {
      const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
      if (Array.isArray(parsed)) return parsed as MockEmployee[];
    }
  } catch {
    // Corrupted or unreadable file — fall back to defaults.
  }
  return DEFAULT_EMPLOYEES.map((e) => ({ ...e }));
}

let mockEmployees: MockEmployee[] = loadFromDisk();

// In development, we can force a reload to pick up out-of-band changes
export function forceReload() {
  mockEmployees = loadFromDisk();
}

function persist() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(mockEmployees, null, 2), 'utf-8');
  } catch {
    // Never crash the request because persistence failed.
  }
}

const SECRET_KEYS = ['password', 'password_hash'];

function sanitize(record: MockEmployee): MockEmployee {
  const clean = { ...record };
  SECRET_KEYS.forEach((key) => {
    delete clean[key];
  });
  return clean;
}

export const MockEmployees = {
  getAll(): MockEmployee[] {
    return mockEmployees.map(sanitize);
  },
  getById(id: string): MockEmployee | undefined {
    const record = mockEmployees.find((e) => e.id === id);
    return record ? sanitize(record) : undefined;
  },
  findByEmail(email: string): MockEmployee | undefined {
    const record = mockEmployees.find((e) => e.email.toLowerCase() === String(email || '').toLowerCase());
    return record ? sanitize(record) : undefined;
  },
  findByEmployeeId(employeeId: string): MockEmployee | undefined {
    const record = mockEmployees.find((e) => e.employee_id === employeeId);
    return record ? sanitize(record) : undefined;
  },
  // Returns the raw record (including password_hash) for login verification.
  findForLogin(email?: string, employeeId?: string): MockEmployee | undefined {
    if (email) {
      const byEmail = mockEmployees.find((e) => e.email.toLowerCase() === email.toLowerCase());
      if (byEmail) return byEmail;
    }
    if (employeeId) return mockEmployees.find((e) => e.employee_id === employeeId);
    return undefined;
  },
  add(data: Record<string, unknown>): MockEmployee {
    const now = new Date().toISOString();
    const record: MockEmployee = {
      id: crypto.randomUUID(),
      full_name: String(data.full_name || ''),
      email: String(data.email || ''),
      role: String(data.role || 'Employee'),
      status: String(data.status || 'Active'),
      employment_type: String(data.employment_type || 'Full-time'),
      created_at: now,
      updated_at: now,
      ...data,
    };
    if (record.password) {
      record.password_hash = hashPassword(String(record.password));
      delete record.password;
    }
    if (!record.employee_id) {
      const maxNum = mockEmployees.reduce((max, e) => {
        const n = parseInt(String(e.employee_id || '').replace(/\D/g, ''), 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0);
      record.employee_id = `EMP${String(maxNum + 1).padStart(5, '0')}`;
    }
    mockEmployees.push(record);
    persist();
    return sanitize(record);
  },
  update(id: string, data: Record<string, unknown>): MockEmployee | undefined {
    const idx = mockEmployees.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    const patch = { ...data };
    if (patch.password) {
      patch.password_hash = hashPassword(String(patch.password));
      delete patch.password;
    }
    mockEmployees[idx] = { ...mockEmployees[idx], ...patch, id, updated_at: new Date().toISOString() };
    persist();
    return sanitize(mockEmployees[idx]);
  },
  remove(id: string): boolean {
    const before = mockEmployees.length;
    mockEmployees = mockEmployees.filter((e) => e.id !== id);
    if (mockEmployees.length < before) {
      persist();
      return true;
    }
    return false;
  },
};
