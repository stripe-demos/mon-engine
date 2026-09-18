import { describe, it, expect } from 'vitest';
import { scoreArtifact, deriveStatus, getNextMissingField } from './scoring';

describe('scoreArtifact', () => {
  it('scores 0 completeness and 0 confidence with no fields present', () => {
    const result = scoreArtifact('business_details', {}, {});
    expect(result.completeness).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });

  it('is deterministic — same inputs always produce the same outputs', () => {
    const content = { companyName: 'Acme', companyLocation: 'San Francisco, CA', serviceableMarkets: ['United States'] };
    const sources = { companyName: 'extracted', companyLocation: 'extracted', serviceableMarkets: 'extracted' };
    const a = scoreArtifact('business_details', content, sources, { evidenceCount: 2 });
    const b = scoreArtifact('business_details', content, sources, { evidenceCount: 2 });
    expect(a).toEqual(b);
  });

  it('weights required fields more than optional fields for completeness', () => {
    const requiredOnly = scoreArtifact(
      'business_details',
      { companyName: 'Acme', companyLocation: 'San Francisco, CA', serviceableMarkets: ['United States'] },
      { companyName: 'extracted', companyLocation: 'extracted', serviceableMarkets: 'extracted' }
    );
    const optionalOnly = scoreArtifact(
      'business_details',
      { yearFounded: '2021' },
      { yearFounded: 'extracted' }
    );
    expect(requiredOnly.completeness).toBeGreaterThan(optionalOnly.completeness);
    expect(requiredOnly.missingFields).toEqual([]);
  });

  it('gives extracted fields higher confidence than recommended fields', () => {
    const extracted = scoreArtifact(
      'pricing_and_packaging',
      { pricingGuidanceLevel: 'Configure an existing model', currentPricingApproach: 'Flat monthly fee' },
      { pricingGuidanceLevel: 'extracted', currentPricingApproach: 'extracted' }
    );
    const recommended = scoreArtifact(
      'pricing_and_packaging',
      { pricingGuidanceLevel: 'Get recommendations', currentPricingApproach: 'Recommended by the agent' },
      { pricingGuidanceLevel: 'recommended', currentPricingApproach: 'recommended' }
    );
    expect(extracted.confidence).toBeGreaterThan(recommended.confidence);
  });

  it('increases confidence with more supporting evidence, up to a cap', () => {
    const content = { companyName: 'Acme', companyLocation: 'San Francisco, CA', serviceableMarkets: ['United States'] };
    const sources = { companyName: 'extracted', companyLocation: 'extracted', serviceableMarkets: 'extracted' };
    const noEvidence = scoreArtifact('business_details', content, sources, { evidenceCount: 0 });
    const someEvidence = scoreArtifact('business_details', content, sources, { evidenceCount: 4 });
    expect(someEvidence.confidence).toBeGreaterThanOrEqual(noEvidence.confidence);
    expect(someEvidence.confidence).toBeLessThanOrEqual(100);
  });

  it('penalizes confidence for unresolved contradictions', () => {
    const content = { companyName: 'Acme', companyLocation: 'San Francisco, CA', serviceableMarkets: ['United States'] };
    const sources = { companyName: 'extracted', companyLocation: 'extracted', serviceableMarkets: 'extracted' };
    const clean = scoreArtifact('business_details', content, sources, {});
    const contradicted = scoreArtifact('business_details', content, sources, { contradictions: ['conflicting market claim'] });
    expect(contradicted.confidence).toBeLessThan(clean.confidence);
  });

  it('throws on an unknown category', () => {
    expect(() => scoreArtifact('not_a_category', {}, {})).toThrow();
  });
});

describe('deriveStatus', () => {
  it('is waiting before any analysis has run', () => {
    const status = deriveStatus({ completeness: 0, confidence: 0, missingFields: [] }, { hasBeenAnalyzed: false, hasPendingQuestion: false });
    expect(status).toBe('waiting');
  });

  it('needs information when a question is pending, even if otherwise complete', () => {
    const status = deriveStatus({ completeness: 100, confidence: 100, missingFields: [] }, { hasBeenAnalyzed: true, hasPendingQuestion: true });
    expect(status).toBe('needs_information');
  });

  it('needs information when required fields are missing', () => {
    const status = deriveStatus({ completeness: 40, confidence: 50, missingFields: ['company name'] }, { hasBeenAnalyzed: true, hasPendingQuestion: false });
    expect(status).toBe('needs_information');
  });

  it('is ready once analyzed, complete, and unblocked', () => {
    const status = deriveStatus({ completeness: 100, confidence: 90, missingFields: [] }, { hasBeenAnalyzed: true, hasPendingQuestion: false });
    expect(status).toBe('ready');
  });
});

describe('getNextMissingField', () => {
  it('returns the first missing required field before any optional field', () => {
    const field = getNextMissingField('business_details', { companyName: 'Acme' });
    expect(field).toBe('companyLocation');
  });

  it('falls back to optional fields once all required fields are present', () => {
    const field = getNextMissingField('business_details', {
      companyName: 'Acme',
      companyLocation: 'San Francisco, CA',
      serviceableMarkets: ['United States'],
    });
    expect(field).toBe('yearFounded');
  });

  it('returns null once every field is present', () => {
    const field = getNextMissingField('value_proposition', {
      valueProvided: 'We help teams ship faster.',
      valueEmphasis: 'Speed',
      customerOutcomes: 'Faster releases',
      wantsHelpDefining: 'No',
      comparableCompanies: 'None',
    });
    expect(field).toBeNull();
  });
});
