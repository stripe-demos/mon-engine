import { describe, it, expect } from 'vitest';
import { analyzeText, updateArtifactFromAnswer, buildRecommendedPlans, buildRecommendedConfig } from './analyzer';
import { EXAMPLE_BUSINESS_DESCRIPTION, DEFAULT_CLOUD_MARKUP, DEFAULT_AI_MARKUP } from './constants';

describe('analyzeText', () => {
  const result = analyzeText(EXAMPLE_BUSINESS_DESCRIPTION, 'src_1', 'Business description');

  it('infers serviceable markets from customer segments spanning individual devs to enterprises', () => {
    expect(result.business_details.content.serviceableMarkets).toEqual(
      expect.arrayContaining(['Individual developers', 'Enterprises'])
    );
    expect(result.business_details.fieldSources.serviceableMarkets).toBe('inferred');
  });

  it('every evidence excerpt is a real substring of the source text', () => {
    const allEvidence = Object.values(result).flatMap((r) => r.evidence);
    expect(allEvidence.length).toBeGreaterThan(0);
    for (const ev of allEvidence) {
      const normalizedExcerpt = ev.excerpt.replace(/…$/, '').trim();
      expect(EXAMPLE_BUSINESS_DESCRIPTION).toContain(normalizedExcerpt.length > 0 ? normalizedExcerpt.slice(0, 30) : normalizedExcerpt);
    }
  });

  it('infers a hybrid sales motion from the mix of self-serve and enterprise segments', () => {
    expect(result.business_model.content.salesMotion).toBe('Hybrid');
    expect(result.business_model.fieldSources.salesMotion).toBe('inferred');
  });

  it('identifies what customers receive from compute + AI language', () => {
    expect(result.what_you_sell.content.whatCustomerReceives).toMatch(/compute/i);
    expect(result.what_you_sell.fieldSources.whatCustomerReceives).toBe('extracted');
    expect(result.what_you_sell.content.meteredActivity).toEqual(
      expect.arrayContaining(['Compute jobs started', 'AI tokens consumed'])
    );
  });

  it('leaves pricing and packaging empty rather than guessing', () => {
    expect(result.pricing_and_packaging.content).toEqual({});
  });

  it('never assigns a fieldSource without a corresponding content value', () => {
    for (const artifact of Object.values(result)) {
      for (const field of Object.keys(artifact.fieldSources)) {
        expect(artifact.content[field]).toBeDefined();
      }
    }
  });

  it('produces no business_details or what_you_sell content from unrelated text', () => {
    const empty = analyzeText('This is a short sentence about nothing in particular.', 'src_2', 'Doc');
    expect(empty.business_details.content.serviceableMarkets).toBeUndefined();
    expect(empty.what_you_sell.content.whatCustomerReceives).toBeUndefined();
  });

  it('is deterministic for the same input text', () => {
    const again = analyzeText(EXAMPLE_BUSINESS_DESCRIPTION, 'src_1', 'Business description');
    expect(again).toEqual(result);
  });
});

describe('updateArtifactFromAnswer', () => {
  it('marks the answered field as user_confirmed and includes the answer as evidence', () => {
    const patch = updateArtifactFromAnswer('business_details', 'companyName', 'Acme Compute Platform');
    expect(patch.content.companyName).toBe('Acme Compute Platform');
    expect(patch.fieldSources.companyName).toBe('user_confirmed');
    expect(patch.evidence[0].evidenceType).toBe('user_confirmation');
    expect(patch.evidence[0].excerpt).toContain('Acme Compute Platform');
  });

  it('trims whitespace from the answer', () => {
    const patch = updateArtifactFromAnswer('business_details', 'companyLocation', '  San Francisco, CA  ');
    expect(patch.content.companyLocation).toBe('San Francisco, CA');
  });

  it('produces an empty patch for a blank answer', () => {
    const patch = updateArtifactFromAnswer('business_details', 'companyName', '   ');
    expect(patch.content).toEqual({});
    expect(patch.fieldSources).toEqual({});
  });

  it('works for any field name across categories', () => {
    const patch = updateArtifactFromAnswer('pricing_and_packaging', 'currentPricingApproach', 'We charge $0.02 per compute job');
    expect(patch.content.currentPricingApproach).toBe('We charge $0.02 per compute job');
    expect(patch.fieldSources.currentPricingApproach).toBe('user_confirmed');
  });
});

describe('buildRecommendedPlans / buildRecommendedConfig', () => {
  it('produces exactly Free, Scale, and Enterprise plans', () => {
    const plans = buildRecommendedPlans();
    expect(plans.map((p) => p.id)).toEqual(['free', 'scale', 'enterprise']);
  });

  it('applies the default 15% cloud markup and 20% AI markup', () => {
    const config = buildRecommendedConfig();
    expect(config.cloudMarkupPercentage).toBe(DEFAULT_CLOUD_MARKUP);
    expect(config.aiMarkupPercentage).toBe(DEFAULT_AI_MARKUP);
    expect(config.cloudMarkupPercentage).toBe(15);
    expect(config.aiMarkupPercentage).toBe(20);
  });

  it('enables AWS, Cloudflare, and Microsoft as cloud providers and Anthropic + OpenAI as AI providers', () => {
    const config = buildRecommendedConfig();
    expect(config.cloudProviders.map((p) => p.id)).toEqual(['aws', 'cloudflare', 'microsoft']);
    expect(config.aiProviders.map((p) => p.id)).toEqual(['anthropic', 'openai']);
    expect(config.cloudProviders.every((p) => p.enabled)).toBe(true);
  });

  it('returns fresh, independent objects on each call so callers can mutate safely', () => {
    const a = buildRecommendedConfig();
    const b = buildRecommendedConfig();
    a.cloudProviders[0].enabled = false;
    expect(b.cloudProviders[0].enabled).toBe(true);
  });
});
