# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac.spec.ts >> RBAC End-to-End Tests >> Employee is redirected from admin panel
- Location: e2e\rbac.spec.ts:6:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "/unauthorized"
Received string:    "http://localhost:3000/login"
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - main [ref=f1e3]:
    - generic [ref=f1e6]:
      - generic [ref=f1e7]:
        - img "SecureAuth Workplace Logo" [ref=f1e9]
        - heading "Welcome back" [level=1] [ref=f1e10]
        - paragraph [ref=f1e11]: Select your role to continue
      - generic [ref=f1e12]:
        - button [ref=f1e13]:
          - generic [ref=f1e19]:
            - heading "Company admin" [level=3] [ref=f1e20]
            - paragraph [ref=f1e21]: Manage employees and security settings
        - button [ref=f1e22]:
          - generic [ref=f1e29]:
            - heading "Department Manager" [level=3] [ref=f1e30]
            - paragraph [ref=f1e31]: Manage department employees and access apps
        - button [ref=f1e32]:
          - generic [ref=f1e39]:
            - heading "Employee" [level=3] [ref=f1e40]
            - paragraph [ref=f1e41]: Access workplace applications securely
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=f1e47] [cursor=pointer]
  - alert [ref=f1e51]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Mock test suite assuming mock mode is enabled for tests.
  4  | test.describe('RBAC End-to-End Tests', () => {
  5  |   
  6  |   test('Employee is redirected from admin panel', async ({ page }) => {
  7  |     // Navigate to login and mock employee login
  8  |     await page.goto('/login');
  9  |     // Assuming there is a quick mock login flow
  10 |     // Replace with actual mock login selectors
  11 |     
  12 |     // Direct attempt to access admin users page
  13 |     const response = await page.goto('/admin/users');
  14 |     
  15 |     // Should be redirected to unauthorized or login
> 16 |     expect(page.url()).toContain('/unauthorized');
     |                        ^ Error: expect(received).toContain(expected) // indexOf
  17 |   });
  18 | 
  19 |   test('Admin can access the user management panel', async ({ page }) => {
  20 |     // Navigate to login
  21 |     await page.goto('/login');
  22 |     // Mock login as admin
  23 |     
  24 |     // Go to admin users
  25 |     await page.goto('/admin/users');
  26 |     
  27 |     // Wait for the admin page to load
  28 |     await expect(page.getByRole('heading', { name: /Access Management/i })).toBeVisible();
  29 |     
  30 |     // Check if the table loaded
  31 |     await expect(page.locator('table')).toBeVisible();
  32 |   });
  33 | 
  34 |   test('Super Admin can navigate to audit logs and export', async ({ page }) => {
  35 |     // Navigate to login
  36 |     await page.goto('/login');
  37 |     // Mock login as super admin
  38 | 
  39 |     await page.goto('/admin/audit');
  40 |     await expect(page.getByRole('heading', { name: /Role Audit Logs/i })).toBeVisible();
  41 | 
  42 |     // Check export button
  43 |     const exportBtn = page.getByRole('button', { name: /Export CSV/i });
  44 |     await expect(exportBtn).toBeVisible();
  45 |   });
  46 | });
  47 | 
```