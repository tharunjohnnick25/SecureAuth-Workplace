import { AuthGuardWrapper } from '@/components/auth/AuthGuardWrapper';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { OrganizationProvider } from '@/context/OrganizationContext';
import { LanguageProvider } from '@/context/LanguageContext';
import AnimateLayout from '@/components/AnimateLayout';
import { Toaster } from 'sonner';
import { SessionTimeout } from '@/components/SessionTimeout';

import AntiCopy from '@/components/AntiCopy';
import GoogleTranslate from '@/components/GoogleTranslate';
import './globals.css';

export const metadata = {
  title: 'SecureAuth Workplace | Multi-Factor Risk-Based Authentication',
  description: 'Enterprise-grade AI cybersecurity IAM platform with adaptive MFA, zero-trust protocols, and behavioral biometrics.',
  keywords: 'cybersecurity, authentication, MFA, zero trust, IAM, biometrics, risk-based auth, nextjs auth',
  authors: [{ name: 'SecureAuth Workplace Team' }],
  openGraph: {
    title: 'SecureAuth Workplace | The Future of Identity Management',
    description: 'Enterprise-grade zero-trust IAM platform with behavioral AI.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://secureauth01.onrender.com',
    siteName: 'SecureAuth Workplace',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SecureAuth Workplace | Next-Gen Authentication',
    description: 'Protecting your workforce with adaptive risk-based authentication.',
  },
  appleWebApp: {
    capable: true,
    title: 'SecureAuth Workplace',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="antialiased min-h-screen relative bg-[var(--color-cyber-dark)] text-foreground">
        {/* Cyber Progress Bar */}
        <div className="fixed top-0 left-0 right-0 h-[2px] z-[100] bg-gradient-to-r from-transparent via-[var(--color-cyber-blue)] to-transparent opacity-50 shadow-[0_0_10px_var(--color-cyber-blue)]"></div>

        <div className="absolute inset-0 z-[-1] pointer-events-none opacity-20" 
             style={{ 
                backgroundImage: `linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), 
                                  linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)`,
                backgroundSize: '30px 30px'
             }}>
        </div>
        

        <AntiCopy />
        <GoogleTranslate />
        <main className="flex-1">
          <AuthProvider>
            <OrganizationProvider>
              <LanguageProvider>
                <SessionTimeout />
                <AuthGuardWrapper>
                  <AnimateLayout>
                    {children}
                  </AnimateLayout>
                </AuthGuardWrapper>
              </LanguageProvider>
            </OrganizationProvider>
          </AuthProvider>
        </main>

        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(10, 10, 10, 0.8)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
            },
          }}
        />
      </body>
    </html>
  );
}
