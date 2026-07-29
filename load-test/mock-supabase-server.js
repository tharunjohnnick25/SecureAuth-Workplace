const http = require('http');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT || '54321', 10);

let nextId = 100;
let nextDeptId = 20;

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Security', 'Legal', 'Design', 'Product'];
const DESIGNATIONS = ['Software Engineer', 'Senior Engineer', 'Manager', 'Director', 'Analyst', 'Associate', 'Consultant', 'Lead', 'VP', 'CTO'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern'];
const STATUSES = ['Active', 'Active', 'Active', 'Active', 'Inactive'];
const GENDERS = ['Male', 'Female'];
const BLOOD_GROUPS = ['A+', 'B+', 'O+', 'AB+'];

const users = [];
const departments = [
  { id: 1, name: 'Engineering', description: 'Builds and maintains products', created_at: '2024-01-01T00:00:00Z', head_id: null, employee_count: 0, avg_risk_score: 0 },
  { id: 2, name: 'Marketing', description: 'Drives brand and demand', created_at: '2024-01-01T00:00:00Z', head_id: null, employee_count: 0, avg_risk_score: 0 },
  { id: 3, name: 'Sales', description: 'Generates revenue', created_at: '2024-01-01T00:00:00Z', head_id: null, employee_count: 0, avg_risk_score: 0 },
  { id: 4, name: 'HR', description: 'Manages people operations', created_at: '2024-01-01T00:00:00Z', head_id: null, employee_count: 0, avg_risk_score: 0 },
  { id: 5, name: 'Finance', description: 'Manages company finances', created_at: '2024-01-01T00:00:00Z', head_id: null, employee_count: 0, avg_risk_score: 0 },
];

for (let i = 0; i < 50; i++) {
  users.push({
    id: `${50 + i}`,
    employee_id: `EMP${String(100 + i).padStart(5, '0')}`,
    email: `mock.user${i}@company.com`,
    full_name: `Mock User ${i}`,
    phone: `+1555${String(1000000 + i).slice(0, 7)}`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    designation: DESIGNATIONS[i % DESIGNATIONS.length],
    status: STATUSES[i % STATUSES.length],
    employment_type: EMPLOYMENT_TYPES[i % EMPLOYMENT_TYPES.length],
    gender: GENDERS[i % GENDERS.length],
    date_of_joining: '2023-06-15',
    blood_group: BLOOD_GROUPS[i % BLOOD_GROUPS.length],
    address: `${100 + i} Mock Street, Test City`,
    emergency_contact: '+1555123456',
    avatar_url: null,
    role: 'user',
    manager_id: null,
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  });
}

function parseQuery(urlStr) {
  const idx = urlStr.indexOf('?');
  if (idx === -1) return {};
  const qs = urlStr.slice(idx + 1);
  const result = {};
  for (const part of qs.split('&')) {
    const [k, v] = part.split('=').map(decodeURIComponent);
    if (!k) continue;
    if (k === 'select' || k === 'columns') continue;
    if (k === 'order') { result[k] = v; continue; }
    if (k === 'offset') { result[k] = parseInt(v, 10) || 0; continue; }
    if (k === 'limit') { result[k] = parseInt(v, 10) || 10; continue; }
    if (k === 'or') { result.or = result.or || []; result.or.push(v); continue; }
    result[k] = v;
  }
  return result;
}

function applyFilters(rows, params) {
  let filtered = [...rows];
  const { select, order, offset, limit, or, ...filters } = params;

  for (const [key, val] of Object.entries(filters)) {
    if (key === 'id') {
      filtered = filtered.filter(r => r.id === val);
    } else if (key.endsWith('.ilike.%')) {
      const field = key.replace('.ilike.%', '');
      const searchVal = val.replace(/%/g, '').toLowerCase();
      filtered = filtered.filter(r => r[field] && r[field].toLowerCase().includes(searchVal));
    } else if (key.includes('.')) {
      const [field, op] = key.split('.');
      if (op === 'eq') filtered = filtered.filter(r => r[field] == val);
      else if (op === 'neq') filtered = filtered.filter(r => r[field] != val);
      else if (op === 'gt') filtered = filtered.filter(r => r[field] > val);
      else if (op === 'gte') filtered = filtered.filter(r => r[field] >= val);
      else if (op === 'lt') filtered = filtered.filter(r => r[field] < val);
      else if (op === 'lte') filtered = filtered.filter(r => r[field] <= val);
      else filtered = filtered.filter(r => r[field] == val);
    } else {
      filtered = filtered.filter(r => r[key] == val);
    }
  }

  if (or) {
    const orResults = new Set();
    for (const cond of or) {
      const parts = cond.split(',');
      for (const part of parts) {
        const match = part.match(/(\w+)\.ilike\.%(.*?)%/);
        if (match) {
          const field = match[1];
          const searchVal = match[2].toLowerCase();
          for (const r of rows) {
            if (r[field] && r[field].toLowerCase().includes(searchVal)) orResults.add(r);
          }
        }
      }
    }
    filtered = filtered.filter(r => orResults.has(r));
  }

  if (order) {
    const [field, dir] = order.split('.');
    const asc = dir !== 'desc';
    filtered.sort((a, b) => {
      const va = a[field] || '';
      const vb = b[field] || '';
      return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const total = filtered.length;
  const start = offset || 0;
  const end = start + (limit || 50);
  return { data: filtered.slice(start, end), total };
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

function json(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
}

function contentType(headers, expected) {
  const ct = headers['content-type'] || '';
  return ct.includes(expected);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    return res.end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Auth endpoints
    if (path === '/auth/v1/user' && method === 'GET') {
      return json(res, 200, { id: 'mock-user-id', email: 'admin@company.com', aud: 'authenticated', role: 'authenticated' });
    }

    if (path === '/auth/v1/token' && method === 'POST') {
      const body = await parseBody(req);
      return json(res, 200, {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: { id: 'mock-user-id', email: body.email || 'admin@company.com', aud: 'authenticated', role: 'authenticated' },
      });
    }

    if (path === '/auth/v1/logout' && method === 'POST') {
      return json(res, 200, {});
    }

    // Rest endpoints
    const restMatch = path.match(/^\/rest\/v1\/(\w+)/);
    if (!restMatch) {
      return json(res, 404, { error: 'Not found' });
    }

    const table = restMatch[1];
    const params = parseQuery(req.url);
    const countHeader = req.headers['prefer'] || '';

    if (table === 'users') {
      if (method === 'GET') {
        const { data, total } = applyFilters(users, params);
        const headers = {};
        if (countHeader.includes('count=exact')) {
          headers['Content-Range'] = `0-${data.length - 1}/${total}`;
        }
        return json(res, 200, data, headers);
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        const id = String(++nextId);
        const now = new Date().toISOString();
        const newUser = {
          id,
          employee_id: body.employee_id || `EMP${String(1000 + nextId).padStart(5, '0')}`,
          email: body.email || `new.user${nextId}@test.com`,
          full_name: body.full_name || `New User ${nextId}`,
          phone: body.phone || null,
          department: body.department || 'Engineering',
          designation: body.designation || 'Engineer',
          status: body.status || 'Active',
          employment_type: body.employment_type || 'Full-time',
          gender: body.gender || 'Male',
          date_of_joining: body.date_of_joining || new Date().toISOString().split('T')[0],
          blood_group: body.blood_group || 'O+',
          address: body.address || null,
          emergency_contact: body.emergency_contact || null,
          avatar_url: null,
          role: 'user',
          manager_id: body.manager_id || null,
          created_at: now,
          updated_at: now,
          ...body,
          id,
          created_at: now,
          updated_at: now,
        };
        users.unshift(newUser);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(newUser));
      }

      if (method === 'PATCH' || method === 'PUT') {
        const body = await parseBody(req);
        const { data: matched } = applyFilters(users, params);
        for (const user of matched) {
          Object.assign(user, body, { updated_at: new Date().toISOString() });
        }
        return json(res, 200, matched);
      }

      if (method === 'DELETE') {
        const { data: matched } = applyFilters(users, params);
        const ids = new Set(matched.map(u => u.id));
        for (let i = users.length - 1; i >= 0; i--) {
          if (ids.has(users[i].id)) users.splice(i, 1);
        }
        return json(res, 200, matched);
      }
    }

    if (table === 'departments') {
      if (method === 'GET') {
        const queryParams = Object.fromEntries(url.searchParams);
        const countExact = countHeader.includes('count=exact');

        if (queryParams.id) {
          const id = queryParams.id.replace('eq.', '');
          const dept = departments.find(d => d.id == id);
          return json(res, 200, dept ? [dept] : []);
        }

        if (countExact) {
          res.setHeader('Content-Range', `0-${departments.length - 1}/${departments.length}`);
          return json(res, 200, departments);
        }

        const enhanced = departments.map(d => ({
          ...d,
          employees: d.employee_count || 0,
          risk: d.avg_risk_score || 0,
        }));

        if (queryParams.select === 'id,name') {
          return json(res, 200, departments);
        }

        return json(res, 200, enhanced);
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        const id = ++nextDeptId;
        const now = new Date().toISOString();
        const newDept = {
          id,
          name: body.name,
          description: body.description || '',
          created_at: now,
          head_id: body.head_id || null,
          employee_count: 0,
          avg_risk_score: 0,
        };
        departments.push(newDept);
        const response = { ...newDept, employees: 0, risk: 0 };
        res.writeHead(201, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ data: response }));
      }

      if (method === 'PATCH') {
        const body = await parseBody(req);
        const idParam = params['id'];
        if (idParam) {
          const id = parseInt(String(idParam).replace('eq.', ''), 10);
          const dept = departments.find(d => d.id === id);
          if (dept) {
            Object.assign(dept, body, { updated_at: new Date().toISOString() });
            return json(res, 200, { ...dept, employees: dept.employee_count, risk: dept.avg_risk_score });
          }
        }
        return json(res, 404, { error: 'Department not found' });
      }

      if (method === 'DELETE') {
        const idParam = params['id'];
        if (idParam) {
          const id = parseInt(String(idParam).replace('eq.', ''), 10);
          const idx = departments.findIndex(d => d.id === id);
          if (idx >= 0) {
            const removed = departments.splice(idx, 1)[0];
            return json(res, 200, { ...removed, employees: removed.employee_count, risk: removed.avg_risk_score });
          }
        }
        return json(res, 404, { error: 'Department not found' });
      }
    }

    if (table === 'employee_documents') {
      if (method === 'GET') {
        return json(res, 200, []);
      }
      if (method === 'POST') {
        return json(res, 201, { id: String(++nextId), ...await parseBody(req), created_at: new Date().toISOString() });
      }
      if (method === 'DELETE') {
        return json(res, 200, {});
      }
    }

    if (table === 'leave_balances') {
      if (method === 'GET') return json(res, 200, []);
      if (method === 'POST') return json(res, 201, { id: String(++nextId) });
    }

    return json(res, 404, { error: `Unknown table: ${table}` });
  } catch (err) {
    console.error('Mock server error:', err);
    return json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Mock Supabase server running on http://localhost:${PORT}`);
});
