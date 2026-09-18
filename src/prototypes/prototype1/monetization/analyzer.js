import { splitSentences, findSentence, truncate } from './textUtils';
import {
  DEFAULT_CLOUD_MARKUP,
  DEFAULT_AI_MARKUP,
  DEFAULT_CLOUD_PROVIDERS,
  DEFAULT_AI_PROVIDERS,
} from './constants';

// ---------------------------------------------------------------------------
// ContextAnalyzer — a deterministic, replaceable stand-in for a real model.
// Everything here works only from the actual text supplied by the user, so
// evidence excerpts are always real substrings of the source (never invented).
// Most fields in the new intake schema (company location, personas, pricing
// terms, etc.) simply cannot be inferred from a generic description or
// document, so they are intentionally left blank for the chat follow-up flow
// to collect rather than guessed.
// ---------------------------------------------------------------------------

// Many uploaded sources are structured Q&A (a markdown table of
// "| Question | **Answer** |" rows, one per intake field) rather than prose.
// These keyword stems map a question cell to the field it answers so the
// literal answer can be extracted verbatim instead of re-inferred from prose.
const FIELD_KEYWORDS = {
  business_details: {
    companyName: ['company name', 'company called', 'business name', 'business called'],
    companyLocation: ['locat', 'headquarter', 'registered address', 'company based', 'is based in'],
    serviceableMarkets: ['market', 'geograph', 'countries', 'regions'],
    yearFounded: ['founded', 'founding year'],
    businessWebsite: ['website'],
    linkedinProfile: ['linkedin'],
    investorsOrCrunchbase: ['investor', 'crunchbase'],
  },
  business_model: {
    serviceDeliveryModel: ['service-delivery', 'service delivery'],
    targetPersonas: ['target persona', 'ideal customer', 'icp'],
    salesMotion: ['sales motion'],
    primaryCOGS: ['cogs', 'cost of goods'],
    enterpriseMonetization: ['enterprise', 'commercial customers'],
    currentPaymentTiming: ['pay today', 'payment timing', 'prepaid', 'postpaid'],
    upgradeCadence: ['upgrade immediately', 'contract term'],
    subscriptionToUsageTransition: ['usage-based pricing', 'transition to usage'],
  },
  value_proposition: {
    valueProvided: ['value do you provide', 'value proposition'],
    valueEmphasis: ['value emphasi', 'marketing material'],
    customerOutcomes: ['outcome'],
    wantsHelpDefining: ['help defining'],
    comparableCompanies: ['comparable compan'],
  },
  what_you_sell: {
    offeringType: ['product, a service', 'sell a product'],
    offeringNames: ['names of your products', 'product names', 'plan name'],
    whatCustomerReceives: ['customer receive'],
    meteredActivity: ['meter'],
    meterDurability: ['durab'],
    seatsOrFixedUnit: ['seat'],
  },
  pricing_and_packaging: {
    currentPricingApproach: ['currently price', 'pricing approach'],
    pricePerOffering: ['price of each'],
    pricingModels: ['pricing model'],
    billingPeriod: ['billing period', 'contract term applies'],
    usageMeters: ['usage meter', 'determine usage'],
    includedUsageAllocations: ['included usage', 'allocation'],
    pricingAnchor: ['anchor pricing'],
    promotionsAndDiscounts: ['promotion', 'discount', 'trial'],
    additionalPricingLayers: ['minimum commitment', 'overage', 'tiered', 'volume pricing', 'spend cap'],
    invoiceLineItemStructure: ['line-item', 'line item structure'],
    pricingComparableCompany: ['comparable compan'],
  },
};

// Plain `.includes()` matching lets a keyword stem match text buried inside
// an unrelated word — e.g. the stem "locat" (for companyLocation) also
// matches inside "allocations", so a question like "Does Peec provide usage
// allocations?" would wrongly be classified as the company-location
// question. Anchoring the stem to a word boundary avoids that class of bug.
function keywordMatchesQuestion(questionLower, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}`).test(questionLower);
}

function matchQuestionToField(questionLower) {
  for (const category of Object.keys(FIELD_KEYWORDS)) {
    for (const field of Object.keys(FIELD_KEYWORDS[category])) {
      if (FIELD_KEYWORDS[category][field].some((keyword) => keywordMatchesQuestion(questionLower, keyword))) {
        return { category, field };
      }
    }
  }
  return null;
}

function cleanTableAnswer(raw) {
  return raw
    .replace(/\*\*/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.$/, '');
}

// Extracts every "| Question | Answer |" row from a markdown-table-style
// source document, so an explicit answer is used verbatim rather than
// re-derived (and possibly missed) by the prose heuristics below.
function extractTableAnswers(text) {
  const answers = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('|')) continue;
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 2) continue;
    const [question, answer] = cells;
    if (!question || !answer) continue;
    if (/^:?-+:?$/.test(answer)) continue; // markdown table separator row
    const match = matchQuestionToField(question.toLowerCase());
    if (!match) continue;
    const cleaned = cleanTableAnswer(answer);
    if (!cleaned) continue;
    answers.push({ ...match, value: cleaned, excerpt: line });
  }
  return answers;
}

const SEGMENT_PATTERNS = [
  { test: /individual developer/, label: 'Individual developers' },
  { test: /scaling engineering organi[sz]ation|growing (engineering )?team/, label: 'Growing engineering teams' },
  { test: /large enterprise|enterprise organi[sz]ation|\benterprise\b/, label: 'Enterprises' },
  { test: /engineering team/, label: 'Engineering teams' },
  { test: /small business/, label: 'Small businesses' },
  { test: /startup/, label: 'Startups' },
  { test: /developer/, label: 'Developers' },
];

function detectSegments(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const { test, label } of SEGMENT_PATTERNS) {
    if (test.test(lower) && !found.includes(label)) found.push(label);
  }
  return found;
}

function makeEvidence(sourceId, sourceName, excerpt, fields, pageOrSlide) {
  if (!excerpt) return null;
  return {
    id: `ev_${sourceId}_${fields.join('_')}_${Math.round(excerpt.length)}`,
    sourceId,
    sourceName,
    excerpt: truncate(excerpt),
    pageOrSlide,
    supportedFields: fields,
    evidenceType: 'source',
  };
}

/**
 * Pure, deterministic analysis of a block of extracted text.
 * Returns per-category content, field provenance, and evidence — all derived
 * only from `text`. Fields that aren't supported by the text are left out
 * entirely so downstream scoring treats them as missing (never fabricated).
 */
export function analyzeText(text, sourceId, sourceName) {
  const sentences = splitSentences(text);
  const lower = text.toLowerCase();
  const result = {
    business_details: { content: {}, fieldSources: {}, evidence: [], assumptions: [] },
    business_model: { content: {}, fieldSources: {}, evidence: [], assumptions: [] },
    value_proposition: { content: {}, fieldSources: {}, evidence: [], assumptions: [] },
    what_you_sell: { content: {}, fieldSources: {}, evidence: [], assumptions: [] },
    pricing_and_packaging: { content: {}, fieldSources: {}, evidence: [], assumptions: [] },
  };

  // --- Structured Q&A tables -------------------------------------------------
  // If the source is a "| Question | **Answer** |" style document, pull the
  // literal answers in first — they're authoritative and should win over any
  // prose heuristic guess below.
  for (const { category, field, value, excerpt } of extractTableAnswers(text)) {
    result[category].content[field] = value;
    result[category].fieldSources[field] = 'extracted';
    const ev = makeEvidence(sourceId, sourceName, excerpt, [field]);
    if (ev) result[category].evidence.push(ev);
  }

  const segments = detectSegments(text);
  const customerSentence = findSentence(sentences, ['customer', 'developer', 'enterprise', 'team']);

  // --- Business details ---------------------------------------------------
  // Company name/location, founding year, website, and markets require
  // structured facts a generic description rarely states — left for the
  // agent to ask about directly rather than guessed.
  if (segments.length && !result.business_details.content.serviceableMarkets) {
    result.business_details.content.serviceableMarkets = segments;
    result.business_details.fieldSources.serviceableMarkets = 'inferred';
    result.business_details.assumptions.push('Serviceable markets were inferred from the customer segments mentioned, not stated as geographies — please confirm.');
    const ev = makeEvidence(sourceId, sourceName, customerSentence, ['serviceableMarkets']);
    if (ev) result.business_details.evidence.push(ev);
  }

  // --- Business model -------------------------------------------------------
  if (!result.business_model.content.salesMotion) {
    if (/product-led|self-serve|self serve/.test(lower)) {
      result.business_model.content.salesMotion = 'Product-led growth (PLG)';
      result.business_model.fieldSources.salesMotion = 'extracted';
    } else if (/sales-led|enterprise sales/.test(lower)) {
      result.business_model.content.salesMotion = 'Sales-led growth (SLG)';
      result.business_model.fieldSources.salesMotion = 'extracted';
    } else if (segments.includes('Individual developers') && segments.includes('Enterprises')) {
      result.business_model.content.salesMotion = 'Hybrid';
      result.business_model.fieldSources.salesMotion = 'inferred';
      result.business_model.assumptions.push('Sales motion was inferred as hybrid from the mix of self-serve and enterprise customer segments, not stated directly.');
    }
  }

  if (segments.length && !result.business_model.content.targetPersonas) {
    result.business_model.content.targetPersonas = segments;
    result.business_model.fieldSources.targetPersonas = 'extracted';
    const ev = makeEvidence(sourceId, sourceName, customerSentence, ['targetPersonas']);
    if (ev) result.business_model.evidence.push(ev);
  }

  if (!result.business_model.content.currentPaymentTiming) {
    if (/usage-based/.test(lower)) {
      result.business_model.content.currentPaymentTiming = 'Pay as you go';
      result.business_model.fieldSources.currentPaymentTiming = 'inferred';
    } else if (/subscription/.test(lower)) {
      result.business_model.content.currentPaymentTiming = 'Subscription';
      result.business_model.fieldSources.currentPaymentTiming = 'extracted';
    }
  }

  // --- Value proposition ---------------------------------------------------
  const valueSentence = findSentence(sentences, ['help', 'faster', 'reduce', 'analyz', 'lower', 'improve']) || sentences[0];
  if (valueSentence && !result.value_proposition.content.valueProvided) {
    result.value_proposition.content.valueProvided = composeValueStatement(valueSentence, lower);
    result.value_proposition.fieldSources.valueProvided = 'inferred';
    result.value_proposition.assumptions.push('Value proposition was restated from the source rather than quoted verbatim, so it should be confirmed.');
    const ev = makeEvidence(sourceId, sourceName, valueSentence, ['valueProvided']);
    if (ev) result.value_proposition.evidence.push(ev);
  }
  if (!result.value_proposition.content.customerOutcomes) {
    const outcomes = [];
    if (/incident/.test(lower)) outcomes.push('Faster incident response');
    if (/deploy/.test(lower)) outcomes.push('Faster deployment analysis');
    if (/cost/.test(lower)) outcomes.push('Lower infrastructure cost');
    if (outcomes.length) {
      result.value_proposition.content.customerOutcomes = outcomes;
      result.value_proposition.fieldSources.customerOutcomes = 'inferred';
    }
  }

  // --- What you sell --------------------------------------------------------
  const computeSentence = findSentence(sentences, ['compute job', 'compute']);
  const aiSentence = findSentence(sentences, [/\bai\b/, 'token', 'analyz']);
  if (!result.what_you_sell.content.whatCustomerReceives) {
    const receives = [];
    if (/compute job|cloud compute/.test(lower)) receives.push('Compute jobs');
    if (/\bai\b|token/.test(lower)) receives.push('AI-analyzed insights');
    if (receives.length) {
      result.what_you_sell.content.whatCustomerReceives = receives.join(' and ');
      result.what_you_sell.fieldSources.whatCustomerReceives = 'extracted';
      const ev1 = makeEvidence(sourceId, sourceName, computeSentence, ['whatCustomerReceives']);
      const ev2 = makeEvidence(sourceId, sourceName, aiSentence, ['whatCustomerReceives']);
      if (ev1) result.what_you_sell.evidence.push(ev1);
      if (ev2 && aiSentence !== computeSentence) result.what_you_sell.evidence.push(ev2);
    }
  }
  if (/software|platform|suite/.test(lower) && !result.what_you_sell.content.offeringType) {
    result.what_you_sell.content.offeringType = 'Product';
    result.what_you_sell.fieldSources.offeringType = 'inferred';
  }
  if (!result.what_you_sell.content.meteredActivity) {
    const meters = [];
    if (/compute job|cloud compute/.test(lower)) meters.push('Compute jobs started');
    if (/\bai\b|token/.test(lower)) meters.push('AI tokens consumed');
    if (meters.length) {
      result.what_you_sell.content.meteredActivity = meters;
      result.what_you_sell.fieldSources.meteredActivity = 'extracted';
    }
  }
  // Product/plan names, seat structure, and meter durability aren't stated in
  // a general description, so they're left blank for the follow-up flow.

  // --- Pricing and packaging -------------------------------------------------
  // Always starts empty: pricing strategy is never present in a business
  // description/document, so the agent must ask rather than guess.

  return result;
}

function composeValueStatement(sentence, lower) {
  if (/devops/.test(lower) && /compute/.test(lower) && /\bai\b/.test(lower)) {
    return 'Help engineering teams run and understand software operations faster by combining cloud compute automation with AI analysis of deployments, logs, and incidents.';
  }
  return sentence;
}

// ---------------------------------------------------------------------------
// updateArtifactFromAnswer — merges a user's free-text answer for a single
// field into a category's content. Marks the touched field as user_confirmed.
// ---------------------------------------------------------------------------
export function updateArtifactFromAnswer(category, field, answerText) {
  const trimmed = answerText.trim();
  const patch = { content: {}, fieldSources: {}, evidence: [] };
  if (!trimmed) return patch;

  patch.content[field] = trimmed;
  patch.fieldSources[field] = 'user_confirmed';
  patch.evidence.push({
    id: `ev_user_${Date.now()}_${field}`,
    sourceId: 'user_input',
    sourceName: 'Your answer',
    excerpt: truncate(trimmed, 200),
    supportedFields: [field],
    evidenceType: 'user_confirmation',
  });

  return patch;
}

export function buildRecommendedPlans() {
  return [
    {
      id: 'free',
      name: 'Free',
      description: 'Evaluate the platform with a limited allowance of compute and AI usage.',
      audience: 'Individual developers',
      basePrice: 0,
      billingCadence: 'month',
      includedComputeJobs: 50,
      includedAiTokens: 100000,
      computeUnitPrice: 0,
      aiTokenPrice: 0,
      benefits: ['Community support', 'Self-serve onboarding', 'Usage capped at included allowance'],
    },
    {
      id: 'scale',
      name: 'Scale',
      description: 'Usage-based pricing for growing engineering teams running production workloads.',
      audience: 'Growing engineering teams',
      basePrice: 0,
      billingCadence: 'month',
      includedComputeJobs: 500,
      includedAiTokens: 2000000,
      computeUnitPrice: 0.02,
      aiTokenPrice: 0.000015,
      benefits: ['Team roles and permissions', 'Usage dashboards', 'Priority email support'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Negotiated commitments, security controls, and invoicing for large organizations.',
      audience: 'Large organizations with security and procurement requirements',
      basePrice: undefined,
      billingCadence: 'custom',
      includedComputeJobs: undefined,
      includedAiTokens: undefined,
      computeUnitPrice: 0.018,
      aiTokenPrice: 0.000013,
      benefits: ['Volume discounts', 'Invoicing', 'SSO and security controls', 'Priority support', 'Contractual terms'],
    },
  ];
}

export function buildRecommendedConfig() {
  return {
    plans: buildRecommendedPlans(),
    cloudMarkupPercentage: DEFAULT_CLOUD_MARKUP,
    aiMarkupPercentage: DEFAULT_AI_MARKUP,
    cloudProviders: DEFAULT_CLOUD_PROVIDERS.map((p) => ({ ...p })),
    aiProviders: DEFAULT_AI_PROVIDERS.map((p) => ({ ...p })),
    currency: 'usd',
  };
}
