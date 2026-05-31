import { z } from 'zod';

const envSchema = z.object({
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('https://placeholder.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default('placeholder-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default('placeholder-service-key'),
  NEXT_PUBLIC_DEPLOYED_URL: z.string().url().default('https://secureauth01.onrender.com'),
  NEXT_PUBLIC_RP_ID: z.string().default('localhost'),
  NEXT_PUBLIC_ORIGIN: z.string().default('http://localhost:3000'),
});

function getEnv() {
  const result = envSchema.safeParse({
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DEPLOYED_URL: process.env.NEXT_PUBLIC_DEPLOYED_URL,
    NEXT_PUBLIC_RP_ID: process.env.NEXT_PUBLIC_RP_ID,
    NEXT_PUBLIC_ORIGIN: process.env.NEXT_PUBLIC_ORIGIN,
  });

  if (!result.success) {
    console.warn('⚠️ Some environment variables are missing, using defaults for build.');
  }

  return result.data || {
    RAZORPAY_KEY_ID: undefined,
    RAZORPAY_KEY_SECRET: undefined,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: undefined,
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-key',
    SUPABASE_SERVICE_ROLE_KEY: 'placeholder-service-key',
    NEXT_PUBLIC_DEPLOYED_URL: 'https://secureauth01.onrender.com',
    NEXT_PUBLIC_RP_ID: 'localhost',
    NEXT_PUBLIC_ORIGIN: 'http://localhost:3000',
  };
}

export const env = getEnv();

export const isSupabaseConfigured = (): boolean => {
  return (
    env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-key' &&
    env.SUPABASE_SERVICE_ROLE_KEY !== 'placeholder-service-key'
  );
};
