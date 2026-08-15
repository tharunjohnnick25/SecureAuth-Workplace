/**
 * GDPR / DPDP Data Protection Impact Assessment checklist for the face
 * recognition system. Shared between the admin DPIA page and API routes.
 */

export interface DpiaQuestion {
  id: string;
  category: 'Necessity' | 'Proportionality' | 'Consent' | 'Data Minimization' | 'Storage' | 'Security' | 'Rights' | 'Accountability';
  text: string;
  hint: string;
  critical: boolean;
}

export const DPIA_QUESTIONS: DpiaQuestion[] = [
  { id: 'necessity', category: 'Necessity', text: 'Is facial biometric processing necessary for the stated purpose?', hint: 'Document why face recognition (vs. alternative identity verification) is required.', critical: true },
  { id: 'proportionality', category: 'Proportionality', text: 'Is there a less privacy-intrusive alternative?', hint: 'List alternatives considered (passkeys, tokens) and why they were rejected.', critical: true },
  { id: 'lawful_basis', category: 'Consent', text: 'Is there a lawful basis documented (GDPR Art. 6/9, DPDP Act §4-5)?', hint: 'Explicit, freely-given, specific consent for biometric processing.', critical: true },
  { id: 'consent_mechanism', category: 'Consent', text: 'Is there a consent mechanism with withdrawal support?', hint: 'Timestamped consent + a self-service revoke flow (/settings/biometrics).', critical: true },
  { id: 'data_minimization', category: 'Data Minimization', text: 'Are only embeddings stored — no raw photos?', hint: 'System stores encrypted 128-dim embeddings only; photos are deleted after 24h.', critical: true },
  { id: 'storage_limitation', category: 'Storage', text: 'Are retention and deletion timelines defined and enforced?', hint: '24h photo TTL, 30-day hard-delete after request, audit rows retained.', critical: false },
  { id: 'security', category: 'Security', text: 'Is the data protected in transit and at rest?', hint: 'AES-256-GCM at rest, TLS 1.3 in transit, role-based access.', critical: true },
  { id: 'rights', category: 'Rights', text: 'Are data subject rights (access, rectification, erasure) supported?', hint: 'Self-service status + delete endpoints in /settings/biometrics.', critical: true },
  { id: 'processors', category: 'Accountability', text: 'Are processor agreements (DPAs) in place with cloud providers?', hint: 'Supabase / cloud storage vendors must have signed DPAs.', critical: false },
  { id: 'dpo_review', category: 'Accountability', text: 'Has the Data Protection Officer reviewed this assessment?', hint: 'DPO sign-off recorded before go-live.', critical: false },
  { id: 'transfers', category: 'Accountability', text: 'Is there a cross-border transfer impact assessment if applicable?', hint: 'SCCs/TIA where data crosses jurisdictions.', critical: false },
  { id: 'reidentification', category: 'Data Minimization', text: 'Is the risk of re-identification assessed and mitigated?', hint: 'Embeddings are encrypted; no 1:N identification without a lawful basis.', critical: true },
  { id: 'automation', category: 'Rights', text: 'Is automated decision-making transparent and contestable?', hint: 'Users can appeal face-login denials via passkey fallback.', critical: false },
  { id: 'incident', category: 'Security', text: 'Is there an incident response plan for biometric data breaches?', hint: '72h GDPR notification; 30-day audit logs for forensic review.', critical: true },
];

export type DpiaAnswerValue = 'yes' | 'no' | 'partial';

export interface DpiaAnswer {
  answer: DpiaAnswerValue;
  notes?: string;
}

export interface DpiaSubmission {
  answers: Record<string, DpiaAnswer>;
  employeeScope?: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNASSESSED';

export interface DpiaRisk {
  riskLevel: RiskLevel;
  score: number;        // 0..100 (higher = riskier)
  noCount: number;
  partialCount: number;
  criticalNo: string[];
}

export const DPIA_QUESTIONS_CATEGORY = ['Necessity', 'Proportionality', 'Consent', 'Data Minimization', 'Storage', 'Security', 'Rights', 'Accountability'] as const;

/** Computes the overall risk from the submitted answers. */
export function computeDpiaRisk(submission: DpiaSubmission): DpiaRisk {
  const answers = submission.answers ?? {};
  let noCount = 0;
  let partialCount = 0;
  let score = 0;
  const criticalNo: string[] = [];

  for (const q of DPIA_QUESTIONS) {
    const a = answers[q.id]?.answer;
    if (a === 'no') {
      noCount++;
      if (q.critical) criticalNo.push(q.id);
      score += q.critical ? 25 : 15;
    } else if (a === 'partial') {
      partialCount++;
      score += q.critical ? 12 : 8;
    } else if (a === 'yes') {
      score += 1; // nominal baseline
    }
  }

  // At least one critical "no" is always HIGH.
  let riskLevel: RiskLevel = 'LOW';
  if (criticalNo.length > 0) riskLevel = 'HIGH';
  else if (score >= 40 || noCount >= 3) riskLevel = 'MEDIUM';
  else if (score <= 8) riskLevel = 'LOW';

  return {
    riskLevel,
    score: Math.min(100, score),
    noCount,
    partialCount,
    criticalNo,
  };
}
