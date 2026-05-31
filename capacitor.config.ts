import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.secureauth.app',
  appName: 'SecureAuth AI',
  webDir: 'out',

  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          androidScheme: serverUrl.startsWith('http://') ? 'http' : 'https',
          cleartext: serverUrl.startsWith('http://'),
          allowNavigation: [
            '*.supabase.co',
            '*.vercel.app',
            'secureauth-ai.vercel.app',
            'localhost',
            '*.localhost',
            '10.0.2.2',
          ],
          hostname: 'secureauth-ai.vercel.app',
        },
      }
    : {}),

  android: {
    buildOptions: {
      keystorePath: process.env.ANDROID_KEYSTORE_PATH || null,
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD || null,
      keystoreAlias: process.env.ANDROID_KEYSTORE_ALIAS || null,
      keystoreAliasPassword: process.env.ANDROID_KEYSTORE_ALIAS_PASSWORD || null,
      releaseType: (process.env.ANDROID_RELEASE_TYPE as 'APK' | 'AAB' | undefined) || 'APK',
    },
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#020617',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020617',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      saveToGallery: false,
    },
  },
};

export default config;
