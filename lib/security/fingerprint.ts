export interface DeviceFingerprint {
  userAgent: string;
  browser: string;
  os: string;
  language: string;
  screenResolution: string;
  timezone: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  touchSupport: boolean;
  hash: string;
}

const createFingerprintHash = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
};

const parseBrowser = (userAgent: string) => {
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/Chrome\//i.test(userAgent) && !/Chromium\//i.test(userAgent)) return 'Chrome';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return 'Safari';
  if (/Opera\//i.test(userAgent) || /OPR\//i.test(userAgent)) return 'Opera';
  return 'Unknown';
};

const parseOS = (userAgent: string) => {
  if (/Windows NT/i.test(userAgent)) return 'Windows';
  if (/Mac OS X/i.test(userAgent)) return 'macOS';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Unknown';
};

export function getDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    return {
      userAgent: '',
      browser: 'Unknown',
      os: 'Unknown',
      language: '',
      screenResolution: '',
      timezone: '',
      hardwareConcurrency: 0,
      touchSupport: false,
      hash: 'fp_unknown'
    };
  }

  const userAgent = navigator.userAgent;
  const browser = parseBrowser(userAgent);
  const os = parseOS(userAgent);
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const hardwareConcurrency = navigator.hardwareConcurrency || 0;
  const deviceMemory = (navigator as any).deviceMemory || 0;
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const hashInput = [userAgent, browser, os, screenResolution, timezone, language, hardwareConcurrency, deviceMemory, touchSupport].join('|');
  const hash = createFingerprintHash(hashInput);

  return {
    userAgent,
    browser,
    os,
    language,
    screenResolution,
    timezone,
    hardwareConcurrency,
    deviceMemory,
    touchSupport,
    hash,
  };
}
