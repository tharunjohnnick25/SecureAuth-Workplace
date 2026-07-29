import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// =============================================
// CUSTOM METRICS
// =============================================
const failureRate = new Rate('failed_requests');
const employeeListTrend = new Trend('employee_list_duration');
const employeeGetTrend = new Trend('employee_get_duration');
const employeeCreateTrend = new Trend('employee_create_duration');
const employeeUpdateTrend = new Trend('employee_update_duration');
const employeeDeleteTrend = new Trend('employee_delete_duration');
const departmentListTrend = new Trend('department_list_duration');
const departmentCreateTrend = new Trend('department_create_duration');
const departmentGetTrend = new Trend('department_get_duration');
const departmentAnalyticsTrend = new Trend('department_analytics_duration');
const documentUploadTrend = new Trend('document_upload_duration');
const searchTrend = new Trend('search_duration');
const bulkExportTrend = new Trend('bulk_export_duration');
const totalRequests = new Counter('total_requests');

// =============================================
// CONFIGURATION
// =============================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const TEST_EMPLOYEE_ID = __ENV.TEST_EMPLOYEE_ID || '';

export const options = {
  stages: [
    { duration: '10s', target: 25 },   // Ramp up to 25 users
    { duration: '10s', target: 50 },   // Ramp up to 50
    { duration: '10s', target: 100 },  // Ramp up to 100
    { duration: '30s', target: 100 },  // Stay at 100 for 30s (steady state)
    { duration: '10s', target: 50 },   // Ramp down
    { duration: '10s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
    failed_requests: ['rate<0.05'],
    employee_list_duration: ['p(95)<3000'],
    employee_get_duration: ['p(95)<2000'],
    department_list_duration: ['p(95)<3000'],
    department_analytics_duration: ['p(95)<4000'],
    search_duration: ['p(95)<2000'],
  },
};

// =============================================
// HELPERS
// =============================================
function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  return headers;
}

function randomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Security', 'Legal', 'Design', 'Product'];
const DESIGNATIONS = ['Software Engineer', 'Senior Engineer', 'Manager', 'Director', 'Analyst', 'Associate', 'Consultant', 'Lead', 'VP', 'CTO'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern'];
const STATUSES = ['Active', 'Inactive'];

// =============================================
// SETUP - Create test data
// =============================================
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Auth token: ${AUTH_TOKEN ? 'provided' : 'NOT provided (tests may fail with 401)'}`);

  // Verify health endpoint first
  const healthRes = http.get(`${BASE_URL}/api/health`, { headers: getHeaders() });
  check(healthRes, {
    'Health endpoint is reachable': (r) => r.status === 200,
  });

  if (healthRes.status !== 200) {
    console.warn('WARNING: Health endpoint not reachable. Make sure the server is running.');
  }

  return {
    baseUrl: BASE_URL,
    testStartTime: Date.now(),
  };
}

// =============================================
// MAIN TEST
// =============================================
export default function (data) {
  const headers = getHeaders();
  const tag = randomString(4);
  const email = `loadtest.${tag}.${__VU}_${__ITER}@test.com`;
  const phone = `+1${String(Math.floor(Math.random() * 9000000000) + 1000000000)}`;

  // Generated IDs to track created resources for cleanup
  let createdEmployeeId = null;
  let createdDepartmentId = null;

  // ─────────────────────────────────────────
  // GROUP 1: Employee CRUD Operations
  // ─────────────────────────────────────────
  group('Employee CRUD', function () {
    // 1a. CREATE Employee (weight: high)
    group('Create Employee', function () {
      const createPayload = {
        full_name: `Load Test User ${tag}`,
        email: email,
        phone: phone,
        department: randomItem(DEPARTMENTS),
        designation: randomItem(DESIGNATIONS),
        employment_type: randomItem(EMPLOYMENT_TYPES),
        status: randomItem(STATUSES),
        gender: randomItem(['Male', 'Female']),
        date_of_joining: '2024-01-15',
        blood_group: randomItem(['A+', 'B+', 'O+', 'AB+']),
        address: '123 Test Street, Load City',
        emergency_contact: '+1987654321',
      };

      const start = Date.now();
      const res = http.post(`${BASE_URL}/api/employees`, JSON.stringify(createPayload), {
        headers: headers,
        tags: { name: 'CreateEmployee' },
      });
      const duration = Date.now() - start;

      employeeCreateTrend.add(duration);
      totalRequests.add(1);

      const success = check(res, {
        'Create Employee: status is 201 or 200': (r) => r.status === 201 || r.status === 200,
        'Create Employee: has success flag': (r) => {
          try { return JSON.parse(r.body).success === true; } catch { return false; }
        },
      });

      failureRate.add(!success);
      if (success) {
        try {
          createdEmployeeId = JSON.parse(res.body).data?.id;
        } catch { /* ignore */ }
      } else {
        console.warn(`Create Employee failed: ${res.status} ${res.body}`);
      }
    });

    // 1b. LIST Employees (weight: very high)
    group('List Employees', function () {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/employees?page=1&limit=50`, {
        headers: headers,
        tags: { name: 'ListEmployees' },
      });
      const duration = Date.now() - start;

      employeeListTrend.add(duration);
      totalRequests.add(1);

      const success = check(res, {
        'List Employees: status is 200': (r) => r.status === 200,
        'List Employees: returns array': (r) => {
          try { const d = JSON.parse(r.body); return Array.isArray(d.data); } catch { return false; }
        },
      });
      failureRate.add(!success);
    });

    // 1c. GET single employee (if we have an ID, or use a known one)
    group('Get Employee', function () {
      const targetId = createdEmployeeId || TEST_EMPLOYEE_ID;
      if (!targetId) {
        // Try fetching the first employee from the list
        const listRes = http.get(`${BASE_URL}/api/employees?page=1&limit=1`, {
          headers: headers,
          tags: { name: 'GetEmployee_ListLookup' },
        });
        if (listRes.status === 200) {
          try {
            const listData = JSON.parse(listRes.body).data;
            if (listData && listData.length > 0) {
              const start = Date.now();
              const res = http.get(`${BASE_URL}/api/employees/${listData[0].id}`, {
                headers: headers,
                tags: { name: 'GetEmployee' },
              });
              const duration = Date.now() - start;
              employeeGetTrend.add(duration);
              totalRequests.add(1);

              const success = check(res, {
                'Get Employee: status is 200': (r) => r.status === 200,
                'Get Employee: has data': (r) => {
                  try { return JSON.parse(r.body).data?.id !== undefined; } catch { return false; }
                },
              });
              failureRate.add(!success);
            }
          } catch { /* ignore */ }
        }
      } else {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/employees/${targetId}`, {
          headers: headers,
          tags: { name: 'GetEmployee' },
        });
        const duration = Date.now() - start;
        employeeGetTrend.add(duration);
        totalRequests.add(1);

        const success = check(res, {
          'Get Employee: status is 200': (r) => r.status === 200,
        });
        failureRate.add(!success);
      }
    });

    // 1d. SEARCH Employees (weight: high)
    group('Search Employees', function () {
      const searchTerms = ['engineer', 'active', 'manager', 'test', 'alice', 'bob', 'john'];
      const term = randomItem(searchTerms);
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/employees?search=${term}&limit=20`, {
        headers: headers,
        tags: { name: 'SearchEmployees' },
      });
      const duration = Date.now() - start;
      searchTrend.add(duration);
      totalRequests.add(1);

      const success = check(res, {
        'Search Employees: status is 200': (r) => r.status === 200,
      });
      failureRate.add(!success);
    });

    // 1e. FILTER Employees (weight: medium)
    group('Filter Employees', function () {
      const filterParams = [
        `status=Active&department=${encodeURIComponent(randomItem(DEPARTMENTS))}`,
        `employment_type=${encodeURIComponent(randomItem(EMPLOYMENT_TYPES))}`,
        `designation=${encodeURIComponent(randomItem(DESIGNATIONS))}`,
        `gender=Male`,
        `status=Active`,
      ];
      const params = randomItem(filterParams);
      http.get(`${BASE_URL}/api/employees?${params}&limit=20`, {
        headers: headers,
        tags: { name: 'FilterEmployees' },
      });
      totalRequests.add(1);
    });

    // 1f. UPDATE Employee (if we have an ID)
    group('Update Employee', function () {
      const targetId = createdEmployeeId || TEST_EMPLOYEE_ID;
      if (targetId) {
        const updatePayload = {
          designation: randomItem(DESIGNATIONS),
          phone: `+1${String(Math.floor(Math.random() * 9000000000) + 1000000000)}`,
        };

        const start = Date.now();
        const res = http.put(`${BASE_URL}/api/employees/${targetId}`, JSON.stringify(updatePayload), {
          headers: headers,
          tags: { name: 'UpdateEmployee' },
        });
        const duration = Date.now() - start;
        employeeUpdateTrend.add(duration);
        totalRequests.add(1);

        const success = check(res, {
          'Update Employee: status is 200': (r) => r.status === 200,
        });
        failureRate.add(!success);
      }
    });

    // 1g. DELETE Employee (cleanup what we created - low weight)
    if (createdEmployeeId && Math.random() < 0.3) {
      group('Delete Employee', function () {
        const start = Date.now();
        const res = http.del(`${BASE_URL}/api/employees/${createdEmployeeId}`, null, {
          headers: headers,
          tags: { name: 'DeleteEmployee' },
        });
        const duration = Date.now() - start;
        employeeDeleteTrend.add(duration);
        totalRequests.add(1);

        const success = check(res, {
          'Delete Employee: status is 200': (r) => r.status === 200,
        });
        failureRate.add(!success);
      });
    }
  });

  // ─────────────────────────────────────────
  // GROUP 2: Department Operations
  // ─────────────────────────────────────────
  group('Department CRUD', function () {
    // 2a. LIST Departments (weight: very high)
    group('List Departments', function () {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/departments`, {
        headers: headers,
        tags: { name: 'ListDepartments' },
      });
      const duration = Date.now() - start;
      departmentListTrend.add(duration);
      totalRequests.add(1);

      const success = check(res, {
        'List Departments: status is 200': (r) => r.status === 200,
        'List Departments: has data': (r) => {
          try { return Array.isArray(JSON.parse(r.body).data); } catch { return false; }
        },
      });
      failureRate.add(!success);
    });

    // 2b. CREATE Department (weight: medium)
    group('Create Department', function () {
      const deptName = `LoadDept-${randomString(6)}`;
      const createPayload = {
        name: deptName,
        description: 'Created during load test',
      };

      const start = Date.now();
      const res = http.post(`${BASE_URL}/api/departments`, JSON.stringify(createPayload), {
        headers: headers,
        tags: { name: 'CreateDepartment' },
      });
      const duration = Date.now() - start;
      departmentCreateTrend.add(duration);
      totalRequests.add(1);

      const success = check(res, {
        'Create Department: status is 201 or 200': (r) => r.status === 201 || r.status === 200,
      });

      failureRate.add(!success);
      if (success) {
        try {
          createdDepartmentId = JSON.parse(res.body).data?.id;
        } catch { /* ignore */ }
      }
    });

    // 2c. GET Department Details (weight: medium)
    group('Get Department', function () {
      // First get the list, then fetch a random department
      const listRes = http.get(`${BASE_URL}/api/departments`, {
        headers: headers,
        tags: { name: 'GetDepartment_ListLookup' },
      });
      if (listRes.status === 200) {
        try {
          const depts = JSON.parse(listRes.body).data;
          if (depts && depts.length > 0) {
            const deptId = randomItem(depts).id;
            const start = Date.now();
            const res = http.get(`${BASE_URL}/api/departments/${deptId}`, {
              headers: headers,
              tags: { name: 'GetDepartment' },
            });
            const duration = Date.now() - start;
            departmentGetTrend.add(duration);
            totalRequests.add(1);

            const success = check(res, {
              'Get Department: status is 200': (r) => r.status === 200,
            });
            failureRate.add(!success);
          }
        } catch { /* ignore */ }
      }
    });

    // 2d. Department Analytics (weight: medium)
    group('Department Analytics', function () {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/departments/analytics`, {
        headers: headers,
        tags: { name: 'DepartmentAnalytics' },
      });
      const duration = Date.now() - start;
      departmentAnalyticsTrend.add(duration);
      totalRequests.add(1);

      const success = check(res, {
        'Department Analytics: status is 200': (r) => r.status === 200,
      });
      failureRate.add(!success);
    });
  });

  // ─────────────────────────────────────────
  // GROUP 3: Bulk Operations
  // ─────────────────────────────────────────
  group('Bulk Operations', function () {
    // 3a. Export (weight: low - can be expensive)
    if (Math.random() < 0.2) {
      group('Export Employees', function () {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/employees/export?format=csv`, {
          headers: headers,
          tags: { name: 'ExportEmployees' },
          responseType: 'text',
        });
        const duration = Date.now() - start;
        bulkExportTrend.add(duration);
        totalRequests.add(1);

        const success = check(res, {
          'Export Employees: status is 200': (r) => r.status === 200,
          'Export Employees: has CSV content': (r) => r.body && r.body.length > 0,
        });
        failureRate.add(!success);
      });
    }

    // 3b. Employees list with sort & pagination (weight: medium)
    if (Math.random() < 0.4) {
      const sortOptions = ['full_name', 'email', 'department', 'status', 'created_at'];
      const orderOptions = ['asc', 'desc'];
      const page = Math.ceil(Math.random() * 5);
      const sortBy = randomItem(sortOptions);
      const sortOrder = randomItem(orderOptions);

      http.get(`${BASE_URL}/api/employees?page=${page}&limit=50&sort_by=${sortBy}&sort_order=${sortOrder}`, {
        headers: headers,
        tags: { name: 'SortedListEmployees' },
      });
      totalRequests.add(1);
    }
  });

  // ─────────────────────────────────────────
  // GROUP 4: Health & Admin (low weight)
  // ─────────────────────────────────────────
  group('System Endpoints', function () {
    if (Math.random() < 0.1) {
      const res = http.get(`${BASE_URL}/api/health`, {
        headers: headers,
        tags: { name: 'HealthCheck' },
      });
      check(res, {
        'Health Check: status is 200': (r) => r.status === 200,
      });
      totalRequests.add(1);
    }
  });

  // Small sleep to simulate think time
  sleep(Math.random() * 0.5 + 0.1);
}

// =============================================
// TEARDOWN
// =============================================
export function teardown(data) {
  const testDuration = ((Date.now() - data.testStartTime) / 1000).toFixed(1);
  console.log(`Load test completed in ${testDuration}s`);
  console.log(`Base URL: ${data.baseUrl}`);
}

// =============================================
// CUSTOM REPORT HANDLER
// =============================================
export function handleSummary(data) {
  const results = {
    summary: {
      testName: 'Enterprise HRMS - Baseline Load Test',
      baseUrl: BASE_URL,
      totalDuration: `${(data.state.testRunDurationMs / 1000).toFixed(1)}s`,
      virtualUsers: 100,
      totalRequests: data.metrics.http_reqs?.values?.count || 0,
      rps: (data.metrics.http_reqs?.values?.rate || 0).toFixed(1),
      avgResponseTime: (data.metrics.http_req_duration?.values?.avg || 0).toFixed(2),
      minResponseTime: (data.metrics.http_req_duration?.values?.min || 0).toFixed(2),
      maxResponseTime: (data.metrics.http_req_duration?.values?.max || 0).toFixed(2),
      p95ResponseTime: (data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2),
      p99ResponseTime: (data.metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2),
      errorRate: `${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`,
      failedRequests: data.metrics.http_req_failed?.values?.count || 0,
      throughput: `${(data.metrics.http_reqs?.values?.rate || 0).toFixed(1)} req/s`,
    },
    thresholds: {},
    metrics: {},
  };

  // Collect threshold results
  if (data.metrics.http_req_duration?.thresholds) {
    for (const [key, val] of Object.entries(data.metrics.http_req_duration.thresholds)) {
      results.thresholds[`http_req_duration_${key}`] = val.ok ? 'PASS' : 'FAIL';
    }
  }

  // Collect custom metrics
  const customMetrics = [
    'employee_list_duration', 'employee_get_duration', 'employee_create_duration',
    'employee_update_duration', 'employee_delete_duration',
    'department_list_duration', 'department_create_duration', 'department_get_duration',
    'department_analytics_duration', 'document_upload_duration',
    'search_duration', 'bulk_export_duration',
  ];

  for (const name of customMetrics) {
    if (data.metrics[name]) {
      const m = data.metrics[name];
      results.metrics[name] = {
        avg: (m.values?.avg || 0).toFixed(2),
        min: (m.values?.min || 0).toFixed(2),
        max: (m.values?.max || 0).toFixed(2),
        p95: (m.values?.['p(95)'] || 0).toFixed(2),
        count: m.values?.count || 0,
      };
    }
  }

  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'load-test-report.json': JSON.stringify(results, null, 2),
    'load-test-report.html': htmlReport(data),
  };
}
