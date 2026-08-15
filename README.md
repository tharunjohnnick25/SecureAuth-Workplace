This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Role-Based Access Control (RBAC) System

This application includes a complete, enterprise-grade RBAC system with hierarchical permissions.

### Role Hierarchy
1. **`super_admin`** (Level 4): Full system access, including deleting users and viewing all audit logs.
2. **`admin`** (Level 3): Can manage users and change roles.
3. **`manager`** (Level 2): Can access manager-specific routes and team insights.
4. **`employee`** (Level 1): Default role. Can access personal dashboard and settings.

### Admin Dashboard
To manage users, navigate to `/admin/users` (requires `admin` or `super_admin` role):
- **Change Roles:** Click "Edit Role" on any user to update their role, department, and manager.
- **Audit Logs:** View all role changes, complete with timestamps and admin reasons, at `/admin/audit`.

### API Usage Example (TypeScript SDK style)
```ts
// Update a user's role (Admin only)
await fetch('/api/v1/users/USER_UUID/role', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    role: 'manager', 
    department: 'Engineering',
    reason: 'Promotion to team lead' 
  })
});
```

### Identity Provider (IdP) Sync
You can synchronize roles automatically from Google Workspace or Azure AD:
1. Navigate to `/admin/settings`
2. Enable **Automatic Role Sync**
3. Configure the `CRON_SECRET` environment variable to secure the `/api/v1/cron/sync-roles` endpoint.
4. Set up an external Cron job (e.g., Vercel Cron or GitHub Actions) to hit the endpoint periodically.

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Render

This app is configured for deployment on [Render](https://render.com).

1. Push this repo to GitHub
2. In Render dashboard, create a new **Web Service** and connect your repo
3. Set the following environment variables in Render dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service role key
   - `NEXT_PUBLIC_DEPLOYED_URL` — `https://secureauth01.onrender.com`
   - `NEXT_PUBLIC_SITE_URL` — `https://secureauth01.onrender.com`
   - `NEXT_PUBLIC_RP_ID` — `secureauth01.onrender.com`
   - `NEXT_PUBLIC_ORIGIN` — `https://secureauth01.onrender.com`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`

## Build APK with Median.co

To create an Android APK:
1. Go to [Median.co](https://median.co)
2. Enter your deployed Render URL: `https://secureauth01.onrender.com`
3. Configure app name, icon, and permissions in their dashboard
4. Build and download the APK

The app's Capacitor config and Android manifest are already updated for the new domain.
