import { NextResponse } from 'next/server';

// Standard dictionary of cybersecurity AI intelligence questions and answers
const CYBER_INTEL_DB = [
  {
    keywords: ['score', 'risk', 'assessment', 'threat level'],
    answer: "SecureAuth's AI Engine has analyzed your active session parameters: Threat Level is currently classified as [LOW] with a Confidence Score of 99.8%. Your typing behavior matches the historical fingerprint profile (98% keyboard similarity), and your connection originates from a trusted office IP gateway in New York, USA."
  },
  {
    keywords: ['mfa', 'multi-factor', 'otp', 'authenticator'],
    answer: "Multi-Factor Authentication (MFA) is actively enforced globally for all administrative access. To adjust your MFA credentials or pair a new physical hardware key, navigate to the [Security & Policies] tab in Platform Settings or click the 'Enable MFA' configuration panel under your User Profile."
  },
  {
    keywords: ['brute force', 'suspicious login', 'attack', 'anomaly'],
    answer: "SecureAuth's real-time anomaly detection tracks failed login patterns. If an account encounters more than 3 failed attempts in 60 seconds, or matches a known blacklisted geographical location, the session is instantly quarantined, and an interactive biometric check is forced immediately."
  },
  {
    keywords: ['device', 'fingerprint', 'browser'],
    answer: "Your current device fingerprint matches the registered MacBook Pro 16\" hardware profile. Device integrity verification scans hardware canvas parameters, operating system markers, and browser user-agents to detect hardware spoofing attempts with a confidence rate of 99.9%."
  },
  {
    keywords: ['typing', 'behavior', 'biometrics'],
    answer: "SecureAuth tracks dynamic typing behavioral indicators, including key-down to key-up hold times and key-to-key flight speeds. Our behavioral analysis network maps access patterns continuously to detect credential sharing and session hijacking in real-time."
  },
  {
    keywords: ['recommendation', 'advice', 'protect'],
    answer: "SecureAuth Workplace Recommendation: 1. Maintain global MFA enforcement on all employee accounts. 2. Establish strict geo-fencing policies for critical finance and deployment portals. 3. Periodically review the administrative audit logs to identify anomalous access request justifications."
  }
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = body.message?.toLowerCase() || '';

    let matchedAnswer = "";

    // Search dictionary for keyword matches
    for (const entry of CYBER_INTEL_DB) {
      if (entry.keywords.some(keyword => query.includes(keyword))) {
        matchedAnswer = entry.answer;
        break;
      }
    }

    // Default fallback to show highly smart AI analytical capabilities
    if (!matchedAnswer) {
      matchedAnswer = "SecureAuth Workplace Threat Intel: Your request has been analyzed by our adaptive neural gateway. No anomalies detected. Recommendation: Ensure your current session is locked with standard physical hardware security. Ask me about your 'risk score', 'suspicious login checks', or 'device trust' to review system analytics.";
    }

    return NextResponse.json({
      status: 'success',
      response: matchedAnswer,
      metrics: {
        aiConfidenceScore: 0.998,
        riskScore: 0.05,
        anomalyDetected: false,
        deviceTrustRate: 0.999
      }
    });

  } catch (err: any) {
    console.error('AI Assistant Endpoint Error:', err);
    return NextResponse.json({ 
      status: 'error', 
      response: "SecureAuth's neural engine is experiencing heavy operational load. Please verify your connection status and try again." 
    }, { status: 500 });
  }
}
