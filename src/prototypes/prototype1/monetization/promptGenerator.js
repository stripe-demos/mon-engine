// Generates a ready-to-paste Claude Code prompt for instrumenting the two
// billable usage events defined during onboarding. The prototype never sends
// these events itself — it only produces the implementation prompt.

export function generateClaudeCodePrompt(config) {
  const plans = config?.plans || [];
  const planSummary = plans
    .map((p) => `- ${p.name}: ${p.description || 'no description set'}${p.basePrice != null ? ` ($${p.basePrice}/${p.billingCadence || 'month'} base)` : ''}`)
    .join('\n');

  const cloudProviders = (config?.cloudProviders || []).filter((p) => p.enabled).map((p) => p.name).join(', ') || 'none enabled';
  const aiProviders = (config?.aiProviders || []).filter((p) => p.enabled).map((p) => p.name).join(', ') || 'none enabled';

  return `# Instrument Stripe Monetization Engine usage events

Add server-side usage-event tracking for two billable events to this repository: \`compute_job_started\` and \`ai_tokens_consumed\`.

## Before making changes

1. Inspect this repository first. Identify the language, framework, existing Stripe SDK (or Monetization Engine client) usage, configuration/secret-management conventions, and test tooling.
2. Find the server-side code path that starts a compute job.
3. Find the server-side code path where AI token usage becomes authoritatively known (e.g. after a model call completes and usage is returned by the provider).
4. If a Monetization Engine API or Stripe usage-event client is already defined in this repository, use that exact interface. Do not invent an SDK method, API route, or client interface. If no supported interface can be verified, stop and report the missing dependency instead of fabricating an integration.

## Current monetization configuration (for context only — do not hardcode business logic from this into the event payloads)

${planSummary || '- No plans configured yet.'}
Cloud providers enabled: ${cloudProviders}
AI providers enabled: ${aiProviders}
Cloud markup: ${config?.cloudMarkupPercentage ?? 'unset'}%
AI markup: ${config?.aiMarkupPercentage ?? 'unset'}%

## Event envelope

Every usage event must include:

- \`transaction_id\` — a stable, unique ID generated per event for idempotency (do not reuse across retries of the *same* logical event; do reuse it if you retry sending the *same* event after a transient failure).
- \`customer_id\` — the Stripe customer ID this usage belongs to.
- \`timestamp\` — the actual event time in UTC (ISO 8601). Do not hardcode example timestamps.
- \`event_type\` — \`"compute_job_started"\` or \`"ai_tokens_consumed"\`.
- \`properties\` — event-specific fields (see examples below).

### compute_job_started example

\`\`\`json
{
  "transaction_id": "evt_compute_job_01",
  "customer_id": "cus_123",
  "timestamp": "2026-09-17T22:01:00Z",
  "event_type": "compute_job_started",
  "properties": {
    "provider": "aws",
    "compute_job_id": "job_123",
    "compute_units": 1
  }
}
\`\`\`

### ai_tokens_consumed example

\`\`\`json
{
  "transaction_id": "evt_ai_usage_01",
  "customer_id": "cus_123",
  "timestamp": "2026-09-17T22:01:00Z",
  "event_type": "ai_tokens_consumed",
  "properties": {
    "provider": "anthropic",
    "model": "example-model",
    "input_tokens": 1200,
    "output_tokens": 350,
    "total_tokens": 1550
  }
}
\`\`\`

(These timestamps are illustrative only — always emit the real event time in UTC.)

## Implementation requirements

1. Initialize the supported Stripe or Monetization Engine client server-side only. Never expose a Stripe secret key in browser code.
2. Use this repository's existing secret-management and environment-variable conventions — do not introduce a new pattern.
3. Emit \`compute_job_started\` when a compute job is successfully accepted or started.
4. Emit \`ai_tokens_consumed\` when authoritative token usage is available (after the provider call returns usage, not before).
5. Associate every event with the correct Stripe customer ID for the request/session.
6. Generate stable, unique transaction IDs and use them for idempotency — avoid emitting duplicate usage events during retries.
7. Use UTC timestamps for every event.
8. Include the provider and event-specific properties shown above.
9. Validate required event fields before sending; do not send incomplete events.
10. Add logging and error handling around event emission.
11. Decide and document whether a tracking failure should fail the underlying business operation (compute job start / AI response) or be handled asynchronously (e.g. logged and retried) — do not let a tracking failure silently disappear either way.
12. Add unit and integration tests covering: successful emission, idempotency under retry, and behavior when the usage-event call fails.
13. Run this repository's formatter, type checker, linter, tests, and build after making changes.
14. Summarize the files you changed and any assumptions you made, including anything you could not verify.

## Scope

Only add the two events described above. Do not modify unrelated billing logic, and do not fabricate a Stripe API method or Monetization Engine endpoint that isn't already present in this repository or its documented SDK.`;
}
