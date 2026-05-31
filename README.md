This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
