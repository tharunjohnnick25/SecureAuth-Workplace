'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'en' | 'hi' | 'es' | 'fr' | 'de' | 'ta' | 'zh-CN' | 'ja' | 'ko' | 'ar' | 'ru' | 'pt' | 'it' | 'nl' | 'tr';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
];

const translations: Record<string, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    attendance: 'Attendance & Login',
    employees: 'Employee Directory',
    departments: 'Departments',
    security: 'Security Center',
    pricing: 'Subscription Plans',
    monthly: 'Monthly',
    yearly: 'Yearly',
    save20: 'Save 20%',
    subscribeNow: 'Subscribe Now',
    pricingTitle: 'Simple Pricing for Enterprise Security',
    pricingDesc: 'Choose the plan that fits your security scale in Indian Rupees (₹).',
    mostPopular: 'Most Popular',
    perMonth: '/mo',
    perYear: '/yr',
    language: 'Language',
    overview: 'Overview',
    employeeaccess: 'Employee Access',
    officesecurity: 'Office Security',
    systemmanagement: 'System Management',
    notifications: 'Notifications',
    accessRequests: 'Access Requests',
    rolesPermissions: 'Roles & Permissions',
    officeLogins: 'Office Logins',
    aiRisk: 'AI Risk Monitoring',
    deviceFingerprinting: 'Device Fingerprinting',
    threatIntel: 'Threat Intelligence',
    auditLogs: 'Audit Logs',
    analytics: 'Analytics',
    integrations: 'API Integrations',
    settings: 'Settings',
    devices: 'Devices',
    alerts: 'Alerts',
    'Overview': 'Overview',
    'Workspace': 'Workspace',
    'Employee Access': 'Employee Access',
    'Office Security': 'Office Security',
    'System Management': 'System Management',
    'Dashboard': 'Dashboard',
    'Attendance & Login': 'Attendance & Login',
    'Notifications': 'Notifications',
    'Focus Mode': 'Focus Mode',
    'My Tasks': 'My Tasks',
    'Chat with Colleagues': 'Chat with Colleagues',
    'Calendar': 'Calendar',
    'Leave Apply': 'Leave Apply',
    'Secure Notes': 'Secure Notes',
    'Company Drive': 'Company Drive',
    'Video Meetings': 'Video Meetings',
    'Web Bookmarks': 'Web Bookmarks',
    'Internal Mail': 'Internal Mail',
    'Automated Reminders': 'Automated Reminders',
    'Employee Directory': 'Employee Directory',
    'Access Requests': 'Access Requests',
    'Leave Approvals': 'Leave Approvals',
    'Departments': 'Departments',
    'Roles & Permissions': 'Roles & Permissions',
    'Office Logins': 'Office Logins',
    'AI Risk Monitoring': 'AI Risk Monitoring',
    'Device Fingerprinting': 'Device Fingerprinting',
    'Security Center': 'Security Center',
    'Threat Intelligence': 'Threat Intelligence',
    'Attendance Reports': 'Attendance Reports',
    'Audit Logs': 'Audit Logs',
    'Analytics': 'Analytics',
    'Code Compiler': 'Code Compiler',
    'Subscription Plans': 'Subscription Plans',
    'API Integrations': 'API Integrations',
    'Settings': 'Settings',
    dashboardTitle: 'Security Overview',
    dashboardDesc: 'Monitor real-time security events and system health.',
    systemLive: 'System Live',
    totalEmployees: 'Total Employees',
    registeredUsers: 'Registered Users',
    activeSessions: 'Active Sessions',
    last24Hours: 'Last 24 Hours',
    securityAlerts: 'Security Alerts',
    requiringReview: 'Requiring Review',
    systemRisk: 'System Risk',
    automatedEval: 'Automated Evaluation',
    realtimeStream: 'Real-time Authentication Stream',
    showingLast20: 'Showing last 20 events',
    noAuthEvents: 'No authentication events found.',
    event: 'Event',
    user: 'User',
    source: 'Source',
    status: 'Status',
    time: 'Time',
    authorizedSession: 'Authorized Session',
    blockedAttempt: 'Blocked Attempt',
    success: 'SUCCESS',
    failed: 'FAILED',
    unknown: 'Unknown',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    attendance: 'उपस्थिति और लॉगिन',
    employees: 'कर्मचारी निर्देशिका',
    departments: 'विभाग',
    security: 'सुरक्षा केंद्र',
    pricing: 'सदस्यता योजनाएं',
    monthly: 'मासिक',
    yearly: 'वार्षिक',
    save20: '20% बचत',
    subscribeNow: 'अभी सदस्यता लें',
    pricingTitle: 'एंटरप्राइज सुरक्षा के लिए सरल मूल्य निर्धारण',
    pricingDesc: 'भारतीय रुपये (₹) में अपनी सुरक्षा आवश्यकता के अनुसार योजना चुनें।',
    mostPopular: 'सबसे लोकप्रिय',
    perMonth: '/माह',
    perYear: '/वर्ष',
    language: 'भाषा',
    overview: 'अवलोकन',
    employeeaccess: 'कर्मचारी पहुंच',
    officesecurity: 'कार्यालय सुरक्षा',
    systemmanagement: 'प्रणाली प्रबंधन',
    notifications: 'सूचनाएं',
    accessRequests: 'पहुंच अनुरोध',
    rolesPermissions: 'भूमिकाएं और अनुमतियां',
    officeLogins: 'कार्यालय लॉगिन',
    aiRisk: 'एआई जोखिम निगरानी',
    deviceFingerprinting: 'डिवाइस फिंगरप्रिंटिंग',
    threatIntel: 'खतरा खुफिया',
    auditLogs: 'ऑडिट लॉग्स',
    analytics: 'एनालिटिक्स',
    integrations: 'एपीआई एकीकरण',
    settings: 'सेटिंग्स',
    devices: 'उपकरण',
    alerts: 'अलर्ट',
  },
  es: {
    dashboard: 'Panel de Control',
    attendance: 'Asistencia e Inicio de Sesión',
    employees: 'Directorio de Empleados',
    departments: 'Departamentos',
    security: 'Centro de Seguridad',
    pricing: 'Planes de Suscripción',
    monthly: 'Mensual',
    yearly: 'Anual',
    save20: 'Ahorra 20%',
    subscribeNow: 'Suscribirse Ahora',
    pricingTitle: 'Precios Simples para Seguridad Empresarial',
    pricingDesc: 'Elija el plan adecuado para su escala de seguridad en Rupias Indias (₹).',
    mostPopular: 'Más Popular',
    perMonth: '/mes',
    perYear: '/año',
    language: 'Idioma',
    overview: 'Visión General',
    employeeaccess: 'Acceso de Empleados',
    officesecurity: 'Seguridad de Oficina',
    systemmanagement: 'Gestión del Sistema',
    notifications: 'Notificaciones',
    accessRequests: 'Solicitudes de Acceso',
    rolesPermissions: 'Roles y Permisos',
    officeLogins: 'Inicios de Sesión',
    aiRisk: 'Monitoreo de Riesgos AI',
    deviceFingerprinting: 'Huella de Dispositivo',
    threatIntel: 'Inteligencia de Amenazas',
    auditLogs: 'Registros de Auditoría',
    analytics: 'Analítica',
    integrations: 'Integraciones API',
    settings: 'Configuración',
    devices: 'Dispositivos',
    alerts: 'Alertas',
  },
  fr: {
    dashboard: 'Tableau de bord',
    attendance: 'Présence et Connexion',
    employees: 'Annuaire des employés',
    departments: 'Départements',
    security: 'Centre de Sécurité',
    pricing: 'Plans d\'Abonnement',
    monthly: 'Mensuel',
    yearly: 'Annuel',
    save20: 'Économisez 20%',
    subscribeNow: 'S\'abonner Maintenant',
    pricingTitle: 'Tarification Simple pour la Sécurité d\'Entreprise',
    pricingDesc: 'Choisissez le forfait adapté à vos besoins en Roupies indiennes (₹).',
    mostPopular: 'Le Plus Populaire',
    perMonth: '/mois',
    perYear: '/an',
    language: 'Langue',
    overview: 'Aperçu',
    employeeaccess: 'Accès Employé',
    officesecurity: 'Sécurité du Bureau',
    systemmanagement: 'Gestion du Système',
    notifications: 'Notifications',
    accessRequests: 'Demandes d\'Accès',
    rolesPermissions: 'Rôles et Permissions',
    officeLogins: 'Connexions au Bureau',
    aiRisk: 'Surveillance des Risques IA',
    deviceFingerprinting: 'Empreinte de l\'Appareil',
    threatIntel: 'Renseignement sur les Menaces',
    auditLogs: 'Journaux d\'Audit',
    analytics: 'Analytique',
    integrations: 'Intégrations API',
    settings: 'Paramètres',
    devices: 'Appareils',
    alerts: 'Alertes',
  },
  de: {
    dashboard: 'Dashboard',
    attendance: 'Anwesenheit & Login',
    employees: 'Mitarbeiterverzeichnis',
    departments: 'Abteilungen',
    security: 'Sicherheitszentrum',
    pricing: 'Abonnementpläne',
    monthly: 'Monatlich',
    yearly: 'Jährlich',
    save20: '20% Sparen',
    subscribeNow: 'Jetzt Abonnieren',
    pricingTitle: 'Einfache Preise für Unternehmenssicherheit',
    pricingDesc: 'Wählen Sie den passenden Plan in Indischen Rupien (₹).',
    mostPopular: 'Beliebtesten',
    perMonth: '/Monat',
    perYear: '/Jahr',
    language: 'Sprache',
    overview: 'Überblick',
    employeeaccess: 'Mitarbeiterzugang',
    officesecurity: 'Bürosicherheit',
    systemmanagement: 'Systemverwaltung',
    notifications: 'Benachrichtigungen',
    accessRequests: 'Zugriffsanfragen',
    rolesPermissions: 'Rollen & Berechtigungen',
    officeLogins: 'Büro-Logins',
    aiRisk: 'KI-Risikoüberwachung',
    deviceFingerprinting: 'Geräte-Fingerabdruck',
    threatIntel: 'Bedrohungsdaten',
    auditLogs: 'Audit-Protokolle',
    analytics: 'Analytik',
    integrations: 'API-Integrationen',
    settings: 'Einstellungen',
    devices: 'Geräte',
    alerts: 'Alarme',
  },
  ta: {
    dashboard: 'டாஷ்போர்டு',
    attendance: 'வருகை மற்றும் உள்நுழைவு',
    employees: 'ஊழியர் கோப்பகம்',
    departments: 'துறைகள்',
    security: 'பாதுகாப்பு மையம்',
    pricing: 'சந்தா திட்டங்கள்',
    monthly: 'மாதாந்திர',
    yearly: 'ஆண்டுதோறும்',
    save20: '20% சேமிப்பு',
    subscribeNow: 'இப்போது சந்தா பெறுக',
    pricingTitle: 'நிறுவன பாதுகாப்பிற்கான எளிய விலை நிர்ணயம்',
    pricingDesc: 'இந்திய ரூபாயில் (₹) உங்கள் பாதுகாப்பு அளவிற்கு ஏற்ற திட்டத்தைத் தேர்ந்தெடுக்கவும்.',
    mostPopular: 'மிகவும் பிரபலம்',
    perMonth: '/மாதம்',
    perYear: '/ஆண்டு',
    language: 'மொழி',
    overview: 'கண்ணோட்டம்',
    employeeaccess: 'ஊழியர் அணுகல்',
    officesecurity: 'அலுவலக பாதுகாப்பு',
    systemmanagement: 'கணினி மேலாண்மை',
    notifications: 'அறிவிப்புகள்',
    accessRequests: 'அணுகல் கோரிக்கைகள்',
    rolesPermissions: 'பாத்திரங்கள் மற்றும் அனுமதிகள்',
    officeLogins: 'அலுவலக உள்நுழைவுகள்',
    aiRisk: 'AI ஆபத்து கண்காணிப்பு',
    deviceFingerprinting: 'சாதன கைரேகை',
    threatIntel: 'அச்சுறுத்தல் நுண்ணறிவு',
    auditLogs: 'தணிக்கை பதிவுகள்',
    analytics: 'பகுப்பாய்வு',
    integrations: 'API ஒருங்கிணைப்புகள்',
    settings: 'அமைப்புகள்',
    devices: 'சாதனங்கள்',
    alerts: 'எச்சரிக்கைகள்',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [langCode, setLangCode] = useState<LanguageCode>('en');

  useEffect(() => {
    const saved = localStorage.getItem('app_language') as LanguageCode;
    const isValidLang = LANGUAGES.some(l => l.code === saved);
    if (saved && isValidLang) {
      setLangCode(saved);
    }
  }, []);

  const setLanguage = (code: LanguageCode) => {
    setLangCode(code);
    localStorage.setItem('app_language', code);
    
    if (typeof window !== 'undefined') {
      // Set the Google Translate cookie
      // Format: /source-lang/target-lang (e.g., /en/es)
      const domain = window.location.hostname;
      document.cookie = `googtrans=/en/${code}; path=/; domain=${domain}`;
      document.cookie = `googtrans=/en/${code}; path=/`; // Also set for current host just in case

      // Reload to apply the translation natively across all text nodes
      window.location.reload();
    }
  };

  const currentLanguage = LANGUAGES.find((l) => l.code === langCode) || LANGUAGES[0];

  const t = (key: string): string => {
    return translations[langCode]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language: currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      language: LANGUAGES[0],
      setLanguage: () => { },
      t: (key: string) => translations['en']?.[key] || key,
    };
  }
  return context;
}
