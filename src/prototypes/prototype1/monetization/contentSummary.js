import { FIELD_SCHEMA, FIELD_LABELS } from './scoring';

export function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function formatValue(value) {
  return Array.isArray(value) ? value.join(', ') : String(value);
}

// Generic, field-schema-driven summary of an artifact's content, used
// wherever a category's captured fields need to be shown as readable prose
// instead of a raw object — the Context card body and the evidence drawer.
export function summarizeArtifactContent(category, content = {}) {
  const schema = FIELD_SCHEMA[category];
  if (!schema) return '';
  return [...schema.required, ...schema.optional]
    .filter((field) => hasValue(content[field]))
    .map((field) => `${FIELD_LABELS[field] || field}: ${formatValue(content[field])}`)
    .join(' · ');
}

// Plain-English retelling of a category's captured fields — reads like the
// agent explaining "here's what your business is" rather than a label:value
// list. Only present fields contribute a clause; each category has its own
// hand-written sentence shapes since the fields mean different things.
export function humanizeArtifactContent(category, content = {}) {
  const v = (field) => (hasValue(content[field]) ? formatValue(content[field]) : null);
  const sentence = (text) => (text.endsWith('.') ? text : `${text}.`);
  const parts = [];

  if (category === 'business_details') {
    const name = v('companyName');
    const location = v('companyLocation');
    const markets = v('serviceableMarkets');
    const year = v('yearFounded');
    if (name && location) parts.push(`${name} is based in ${location}.`);
    else if (name) parts.push(`The business is ${name}.`);
    else if (location) parts.push(`The business is based in ${location}.`);
    if (markets) parts.push(`It serves ${markets}.`);
    if (year) parts.push(`Founded in ${year}.`);
  } else if (category === 'business_model') {
    const personas = v('targetPersonas');
    const motion = v('salesMotion');
    const delivery = v('serviceDeliveryModel');
    const paymentTiming = v('currentPaymentTiming');
    if (personas) parts.push(`The business sells to ${personas}.`);
    if (motion) parts.push(`Go-to-market is ${motion}.`);
    if (delivery) parts.push(`Delivered as ${delivery}.`);
    if (paymentTiming) parts.push(`Customers currently pay via ${paymentTiming}.`);
  } else if (category === 'value_proposition') {
    const provided = v('valueProvided');
    const outcomes = v('customerOutcomes');
    const emphasis = v('valueEmphasis');
    if (provided) parts.push(sentence(provided));
    if (outcomes) parts.push(`Customers achieve: ${outcomes}.`);
    if (emphasis) parts.push(`Marketing emphasizes ${emphasis}.`);
  } else if (category === 'what_you_sell') {
    const type = v('offeringType');
    const names = v('offeringNames');
    const receives = v('whatCustomerReceives');
    const metered = v('meteredActivity');
    if (type && names) parts.push(`The business sells a ${type} called ${names}.`);
    else if (type) parts.push(`The business sells a ${type}.`);
    else if (names) parts.push(`Offerings: ${names}.`);
    if (receives) parts.push(`Customers receive ${receives}.`);
    if (metered) parts.push(`Usage tracked: ${metered}.`);
  } else if (category === 'pricing_and_packaging') {
    const models = v('pricingModels');
    const approach = v('currentPricingApproach');
    const prices = v('pricePerOffering');
    const billing = v('billingPeriod');
    if (models) parts.push(`Pricing model: ${models}.`);
    else if (approach) parts.push(sentence(approach));
    if (prices) parts.push(`Plans: ${prices}.`);
    if (billing) parts.push(`Billed ${billing}.`);
  }

  return parts.join(' ');
}

/**
 * Full field-by-field breakdown of an artifact — every required and optional
 * field in schema order, each marked present/missing with its value if
 * present. Drives the expanded card view showing exactly what's been
 * extracted and exactly what's still needed to reach 100% completeness.
 */
export function getFieldBreakdown(category, content = {}) {
  const schema = FIELD_SCHEMA[category];
  if (!schema) return [];
  const toRow = (field, required) => ({
    field,
    label: FIELD_LABELS[field] || field,
    required,
    present: hasValue(content[field]),
    value: hasValue(content[field]) ? formatValue(content[field]) : null,
  });
  return [
    ...schema.required.map((field) => toRow(field, true)),
    ...schema.optional.map((field) => toRow(field, false)),
  ];
}
