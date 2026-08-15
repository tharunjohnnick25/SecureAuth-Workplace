export interface Signals {
  isNewDevice?: boolean;
  isUnusualLocation?: boolean;
  isOutsideWorkHours?: boolean;
  isTorOrProxy?: boolean;
  isDormantAccount?: boolean;
  
  // Real signals passed from frontend
  location?: {
    city?: string;
    country?: string;
    ip?: string;
  };
  typingSpeed?: number;
  // If simulated via the UI dropdown
  simulatedRisk?: 'low' | 'medium' | 'high';
}

export function calculateRiskScore(signals: Signals): number {
  if (signals.simulatedRisk) {
    if (signals.simulatedRisk === 'low') return 15;
    if (signals.simulatedRisk === 'medium') return 50;
    if (signals.simulatedRisk === 'high') return 85;
  }

  let score = 0;
  
  if (signals.isNewDevice) score += 30;
  if (signals.isUnusualLocation) score += 25;
  if (signals.isOutsideWorkHours) score += 15;
  if (signals.isTorOrProxy) score += 40;
  if (signals.isDormantAccount) score += 20;
  
  return Math.min(score, 100);
}
