# Baseline (Load) Testing Suite

## Overview

This directory contains a comprehensive **k6-based load testing suite** for the IAM Cybersecurity Authentication System (Next.js + Supabase). The test simulates **100 concurrent virtual users** continuously for approximately **80 seconds** (including ramp-up and ramp-down phases) against all major HRMS API endpoints.

## Test Configuration

| Parameter | Value |
|-----------|-------|
| **Concurrent Virtual Users** | 100 |
| **Ramp-up Time** | 30s (10s per stage: 25→50→100) |
| **Steady State** | 30s at 100 VUs |
| **Ramp-down Time** | 20s |
| **Total Duration** | ~80s |
| **Think Time** | 100-600ms random between requests |
| **Target** | `http://localhost:3000` (configurable) |

## Tested Endpoints

### Employee API
| Endpoint | Weight | Method |
|----------|--------|--------|
| `GET /api/employees` (list + filters + search) | Very High | GET |
| `POST /api/employees` (create) | High | POST |
| `GET /api/employees/:id` (single) | High | GET |
| `PUT /api/employees/:id` (update) | Medium | PUT |
| `DELETE /api/employees/:id` (delete) | Low | DELETE |
| `GET /api/employees/export` (bulk export) | Low | GET |

### Department API
| Endpoint | Weight | Method |
|----------|--------|-------|
| `GET /api/departments` (list) | Very High | GET |
| `POST /api/departments` (create) | Medium | POST |
| `GET /api/departments/:id` (single) | Medium | GET |
| `GET /api/departments/analytics` (analytics) | Medium | GET |

### System
| Endpoint | Weight | Method |
|----------|--------|-------|
| `GET /api/health` (health check) | Low | GET |

## Measured Metrics

| Metric | What It Measures |
|--------|-----------------|
| **RPS (Requests Per Second)** | Total throughput of the system |
| **Response Time (min/avg/max)** | Latency distribution |
| **p95 Response Time** | 95th percentile latency (main SLO) |
| **p99 Response Time** | 99th percentile latency (worst-case) |
| **Error Rate (%)** | Percentage of failed requests |
| **Failed Requests** | Absolute count of errors |
| **Per-Endpoint Duration** | Individual endpoint latency breakdown |
| **CPU & Memory Usage** | System resource utilization (optional) |

## Thresholds (SLOs)

| Threshold | Target | Critical |
|-----------|--------|----------|
| p95 HTTP duration | < 2000ms | < 5000ms |
| HTTP failure rate | < 5% | < 10% |
| p95 Employee list | < 3000ms | < 5000ms |
| p95 Employee get | < 2000ms | < 4000ms |
| p95 Department list | < 3000ms | < 5000ms |
| p95 Department analytics | < 4000ms | < 6000ms |
| p95 Search | < 2000ms | < 4000ms |

## Prerequisites

1. **k6 binary** - Included in this directory (`k6.exe`). If missing, download from:
   - https://github.com/grafana/k6/releases
   - Or install via: `winget install k6` / `brew install k6`

2. **Application must be running** - Start the Next.js app:
   ```powershell
   cd .. && npm run dev
   ```

3. **Supabase connection** - Ensure `.env.local` has valid Supabase credentials

4. **Authentication token** (optional) - If the API requires a Bearer token, pass it via `-AuthToken`

## Running the Test

### Quick Run (no auth required, read-only endpoints)
```powershell
cd load-test
.\run-load-test.ps1 -BaseUrl "http://localhost:3000"
```

### Full Run (with system monitoring)
```powershell
cd load-test
.\run-load-test.ps1 -BaseUrl "http://localhost:3000" -AuthToken "your-jwt-token" -WithMonitoring
```

### Custom Run
```powershell
.\run-load-test.ps1 `
    -BaseUrl "https://your-deployed-app.com" `
    -AuthToken "your-jwt-token" `
    -TestEmployeeId "existing-uuid" `
    -Duration 120 `
    -WithMonitoring
```

### Dry Run (k6 directly)
```powershell
.\k6.exe run load-test.js --env BASE_URL=http://localhost:3000 --vus 100 --duration 80s
```

## Output Files

All results are saved to the `results/` directory:
- `load-test-report-{timestamp}.html` - Interactive HTML report with charts
- `load-test-report-{timestamp}.json` - Structured JSON summary
- `load-test-report-{timestamp}-summary.json` - k6 native summary export
- `load-test-report-{timestamp}-raw.json` - Raw per-request metrics (JSON lines)
- `load-test-report-{timestamp}-monitor.csv` - CPU & Memory data (if `-WithMonitoring` used)
- `load-test-report-{timestamp}-output.txt` - Console output capture

## Interpreting Results

### Good Performance (green)
- p95 < 1000ms, Error rate < 1%, RPS > 100
- Application handles 100 concurrent users comfortably

### Acceptable Performance (yellow)
- p95 < 2000ms, Error rate < 5%, RPS > 50
- Some endpoints may need optimization

### Poor Performance (red)
- p95 > 2000ms, Error rate > 5%
- Bottlenecks identified, optimization required

## Common Issues & Remedies

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| 401 errors | Missing/invalid auth token | Provide valid `-AuthToken` |
| 409 errors on create | Duplicate email/ID from concurrent VUs | Expected behavior, not a real error |
| High p95 on depart analytics | Complex DB query | Add DB index on `department` column |
| Connection refused | Server not running | Start `npm run dev` first |
| Timeout errors | DB connection pool exhausted | Increase Supabase connection pool |
| High memory usage | Image/document payloads | Add response size limits |

## Performance Optimization Tips

1. **Database** - Add indexes on frequently queried columns:
   ```sql
   CREATE INDEX idx_users_department ON public.users(department);
   CREATE INDEX idx_users_status ON public.users(status);
   CREATE INDEX idx_users_email ON public.users(email);
   CREATE INDEX idx_users_employee_id ON public.users(employee_id);
   CREATE INDEX idx_departments_name ON public.departments(name);
   ```

2. **API Caching** - Add response caching for list endpoints:
   ```typescript
   // In API route
   headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
   ```

3. **Pagination** - Ensure all list endpoints respect `limit` parameter

4. **N+1 Queries** - Use `SELECT *` and Supabase joins instead of individual queries

5. **Connection Pooling** - Ensure Supabase client uses connection pooling

## Test Data Cleanup

The test creates temporary employees and departments with names prefixed `LoadTest-` or `LoadDept-`. After the test, clean up:

```sql
DELETE FROM public.users WHERE full_name LIKE 'Load Test User%';
DELETE FROM public.departments WHERE name LIKE 'LoadDept-%';
DELETE FROM public.employee_documents WHERE employee_id IN (
    SELECT id FROM public.users WHERE full_name LIKE 'Load Test User%'
);
```
