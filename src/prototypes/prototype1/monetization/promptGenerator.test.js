import { describe, it, expect } from 'vitest';
import { generateClaudeCodePrompt } from './promptGenerator';
import { buildRecommendedConfig } from './analyzer';

describe('generateClaudeCodePrompt', () => {
  const config = buildRecommendedConfig();
  const prompt = generateClaudeCodePrompt(config);

  it('includes both required event types', () => {
    expect(prompt).toContain('compute_job_started');
    expect(prompt).toContain('ai_tokens_consumed');
  });

  it('includes every field of the event envelope', () => {
    for (const field of ['transaction_id', 'customer_id', 'timestamp', 'event_type', 'properties']) {
      expect(prompt).toContain(field);
    }
  });

  it('instructs Claude Code to inspect the repository before making changes', () => {
    expect(prompt.toLowerCase()).toContain('inspect this repository first');
  });

  it('warns against fabricating an SDK, API, or client interface', () => {
    expect(prompt).toMatch(/do not invent an sdk method/i);
    expect(prompt).toMatch(/do not fabricate a stripe api method/i);
  });

  it('requires UTC timestamps and idempotency handling', () => {
    expect(prompt).toMatch(/utc/i);
    expect(prompt).toMatch(/idempotency/i);
  });

  it('requires tests covering emission, idempotency, and failure handling', () => {
    expect(prompt).toMatch(/idempotency under retry/i);
    expect(prompt).toMatch(/usage-event call fails/i);
  });

  it('reflects the current markup and provider configuration', () => {
    expect(prompt).toContain('Cloud markup: 15%');
    expect(prompt).toContain('AI markup: 20%');
    expect(prompt).toContain('AWS');
    expect(prompt).toContain('Anthropic');
  });

  it('falls back gracefully when no plans are configured', () => {
    const empty = generateClaudeCodePrompt({});
    expect(empty).toContain('No plans configured yet.');
    expect(empty).toContain('Cloud markup: unset%');
  });

  it('restricts scope to only the two named events', () => {
    expect(prompt).toMatch(/only add the two events described above/i);
  });
});
