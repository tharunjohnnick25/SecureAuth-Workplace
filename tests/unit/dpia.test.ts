import { describe, expect, it } from 'vitest';
import { computeDpiaRisk, DPIA_QUESTIONS } from '@/lib/face/dpia';

describe('DPIA risk computation', () => {
  it('returns UNASSESSED-capable LOW for a fully compliant submission', () => {
    const answers: Record<string, any> = Object.fromEntries(
      DPIA_QUESTIONS.map((q) => [q.id, { answer: 'yes' }]),
    );
    const risk = computeDpiaRisk({ answers });
    expect(risk.riskLevel).toBe('LOW');
    expect(risk.noCount).toBe(0);
    expect(risk.criticalNo).toHaveLength(0);
  });

  it('is HIGH when any critical question is answered no', () => {
    const answers: Record<string, any> = Object.fromEntries(
      DPIA_QUESTIONS.map((q) => [q.id, { answer: 'yes' }]),
    );
    answers.consent_mechanism = { answer: 'no' };
    const risk = computeDpiaRisk({ answers });
    expect(risk.riskLevel).toBe('HIGH');
    expect(risk.criticalNo).toContain('consent_mechanism');
  });

  it('is MEDIUM for many partial answers', () => {
    const answers: Record<string, any> = Object.fromEntries(
      DPIA_QUESTIONS.map((q) => [q.id, { answer: 'partial' }]),
    );
    const risk = computeDpiaRisk({ answers });
    expect(['MEDIUM', 'HIGH']).toContain(risk.riskLevel);
  });

  it('is MEDIUM when three non-critical answers are no', () => {
    const answers: Record<string, any> = Object.fromEntries(
      DPIA_QUESTIONS.map((q) => [q.id, { answer: 'yes' }]),
    );
    // Three non-critical questions.
    answers.storage_limitation = { answer: 'no' };
    answers.processors = { answer: 'no' };
    answers.dpo_review = { answer: 'no' };
    const risk = computeDpiaRisk({ answers });
    expect(risk.riskLevel).toBe('MEDIUM');
    expect(risk.criticalNo).toHaveLength(0);
  });

  it('caps the score at 100', () => {
    const answers: Record<string, any> = Object.fromEntries(
      DPIA_QUESTIONS.map((q) => [q.id, { answer: 'no' }]),
    );
    const risk = computeDpiaRisk({ answers });
    expect(risk.score).toBe(100);
  });
});
