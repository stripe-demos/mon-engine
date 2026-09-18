// Deterministic completeness/confidence scoring for Context artifacts.
// Kept fully separate from rendering — components only ever read the ScoreResult shape:
//   { completeness: number, confidence: number, missingFields: string[], confidenceFactors: string[] }
//
// FIELD_SCHEMA is the single source of truth for which fields make up each
// Context artifact. It mirrors the product's exact intake questionnaire —
// required fields drive most of completeness, optional fields refine it.

export const FIELD_SCHEMA = {
  business_details: {
    required: ['companyName', 'companyLocation', 'serviceableMarkets'],
    optional: [
      'yearFounded',
      'businessWebsite',
      'linkedinProfile',
      'investorsOrCrunchbase',
      'sampleInvoiceUpload',
      'invoiceFormattingRequirements',
    ],
  },
  business_model: {
    required: [
      'serviceDeliveryModel',
      'targetPersonas',
      'salesMotion',
      'primaryCOGS',
      'enterpriseMonetization',
      'currentPaymentTiming',
    ],
    optional: ['upgradeCadence', 'subscriptionToUsageTransition'],
  },
  value_proposition: {
    required: ['valueProvided'],
    optional: ['valueEmphasis', 'customerOutcomes', 'wantsHelpDefining', 'comparableCompanies'],
  },
  what_you_sell: {
    required: ['offeringType', 'offeringNames', 'whatCustomerReceives'],
    optional: ['meteredActivity', 'meterDurability', 'seatsOrFixedUnit'],
  },
  pricing_and_packaging: {
    required: ['pricingGuidanceLevel', 'currentPricingApproach', 'pricePerOffering', 'pricingModels'],
    optional: [
      'billingPeriod',
      'usageMeters',
      'includedUsageAllocations',
      'pricingAnchor',
      'promotionsAndDiscounts',
      'additionalPricingLayers',
      'upgradeCadence',
      'subscriptionToUsageTransition',
      'invoiceLineItemStructure',
      'sampleInvoiceUpload',
      'pricingComparableCompany',
    ],
  },
};

// Confidence weight per provenance — how much a given field's value should be "trusted".
const PROVENANCE_WEIGHT = {
  user_confirmed: 100,
  extracted: 90,
  inferred: 60,
  recommended: 45,
};

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export const FIELD_LABELS = {
  // Business details
  companyName: 'company name',
  companyLocation: 'company location',
  yearFounded: 'year founded',
  businessWebsite: 'business website',
  linkedinProfile: 'LinkedIn profile',
  investorsOrCrunchbase: 'known investors or Crunchbase profile',
  serviceableMarkets: 'serviceable markets and geographies',
  sampleInvoiceUpload: 'sample invoice upload',
  invoiceFormattingRequirements: 'invoice formatting or presentation requirements',
  // Business model
  serviceDeliveryModel: 'preferred service-delivery model',
  targetPersonas: 'target personas or ideal customer profiles',
  salesMotion: 'sales motion',
  primaryCOGS: 'primary costs of goods sold',
  enterpriseMonetization: 'how you monetize commercial or enterprise customers',
  currentPaymentTiming: 'how customers pay today',
  upgradeCadence: 'when customers can upgrade',
  subscriptionToUsageTransition: 'interest in moving to usage-based pricing',
  // Value proposition
  valueProvided: 'value you provide to customers',
  valueEmphasis: 'value you emphasize in sales and marketing',
  customerOutcomes: 'outcomes customers achieve',
  wantsHelpDefining: 'whether you want help defining your value proposition',
  comparableCompanies: 'comparable companies to model after',
  // What you sell
  offeringType: 'whether you sell a product, a service, or both',
  offeringNames: 'names of your products, services, plans, or packages',
  whatCustomerReceives: 'what the customer specifically receives',
  meteredActivity: 'product activity or usage you want to meter',
  meterDurability: 'durability of those meters',
  seatsOrFixedUnit: 'seats or another fixed unit',
  // Pricing and packaging
  pricingGuidanceLevel: 'how much pricing guidance you want',
  currentPricingApproach: 'how you currently price and package your products',
  pricePerOffering: 'price of each product, service, plan, or package',
  pricingModels: 'pricing models you use or want to use',
  billingPeriod: 'billing period or contract term',
  usageMeters: 'meters that determine usage and charges',
  includedUsageAllocations: 'included usage or allocations',
  pricingAnchor: 'what pricing is anchored on',
  promotionsAndDiscounts: 'promotions, discounts, credits, trials, or negotiated pricing',
  additionalPricingLayers: 'additional pricing layers required',
  invoiceLineItemStructure: 'invoice line-item structure',
  pricingComparableCompany: 'comparable company to base pricing on',
};

/**
 * @param {string} category
 * @param {object} content - flat field map for the category
 * @param {object} fieldSources - { [field]: 'extracted' | 'inferred' | 'recommended' | 'user_confirmed' }
 * @param {object} [options]
 * @param {number} [options.evidenceCount]
 * @param {string[]} [options.contradictions]
 * @returns {{ completeness: number, confidence: number, missingFields: string[], confidenceFactors: string[] }}
 */
export function scoreArtifact(category, content = {}, fieldSources = {}, options = {}) {
  const schema = FIELD_SCHEMA[category];
  if (!schema) throw new Error(`Unknown Context category: ${category}`);
  const { evidenceCount = 0, contradictions = [] } = options;

  const requiredPresent = schema.required.filter((f) => hasValue(content[f]));
  const optionalPresent = schema.optional.filter((f) => hasValue(content[f]));
  const missingFields = schema.required
    .filter((f) => !hasValue(content[f]))
    .map((f) => FIELD_LABELS[f] || f);

  const requiredScore = schema.required.length
    ? requiredPresent.length / schema.required.length
    : 1;
  const optionalScore = schema.optional.length
    ? optionalPresent.length / schema.optional.length
    : 1;

  const completeness = Math.round((requiredScore * 0.8 + optionalScore * 0.2) * 100);

  const presentFields = [...requiredPresent, ...optionalPresent];
  const confidenceFactors = [];
  let confidence = 0;

  if (presentFields.length === 0) {
    confidence = 0;
  } else {
    const weights = presentFields.map((f) => PROVENANCE_WEIGHT[fieldSources[f]] ?? PROVENANCE_WEIGHT.inferred);
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;

    const evidenceBonus = Math.min(evidenceCount * 3, 12);
    const contradictionPenalty = contradictions.length * 15;

    confidence = Math.max(0, Math.min(100, Math.round(avg + evidenceBonus - contradictionPenalty)));

    const extractedCount = presentFields.filter((f) => fieldSources[f] === 'extracted').length;
    const inferredCount = presentFields.filter((f) => fieldSources[f] === 'inferred').length;
    const confirmedCount = presentFields.filter((f) => fieldSources[f] === 'user_confirmed').length;
    const recommendedCount = presentFields.filter((f) => fieldSources[f] === 'recommended').length;

    if (confirmedCount > 0) confidenceFactors.push(`${confirmedCount} field${confirmedCount === 1 ? '' : 's'} confirmed by you`);
    if (extractedCount > 0) confidenceFactors.push(`${extractedCount} field${extractedCount === 1 ? '' : 's'} directly stated in the source`);
    if (inferredCount > 0) confidenceFactors.push(`${inferredCount} field${inferredCount === 1 ? '' : 's'} inferred from ambiguous wording`);
    if (recommendedCount > 0) confidenceFactors.push(`${recommendedCount} field${recommendedCount === 1 ? '' : 's'} based on a recommendation, not the source`);
    if (evidenceCount > 0) confidenceFactors.push(`${evidenceCount} supporting evidence excerpt${evidenceCount === 1 ? '' : 's'}`);
    if (contradictions.length > 0) confidenceFactors.push(`${contradictions.length} unresolved contradiction${contradictions.length === 1 ? '' : 's'}`);
  }

  return { completeness, confidence, missingFields, confidenceFactors };
}

export function deriveStatus(scoreResult, { hasBeenAnalyzed, hasPendingQuestion }) {
  if (!hasBeenAnalyzed) return 'waiting';
  if (hasPendingQuestion) return 'needs_information';
  if (scoreResult.completeness < 60 || scoreResult.missingFields.length > 0) return 'needs_information';
  return 'ready';
}

/**
 * Returns the next field (required first, then optional, in schema order) that
 * has no value yet, or null if the artifact already has everything it needs.
 * Used to drive the one-question-at-a-time chat follow-up flow.
 */
export function getNextMissingField(category, content = {}) {
  const schema = FIELD_SCHEMA[category];
  if (!schema) throw new Error(`Unknown Context category: ${category}`);
  const missingRequired = schema.required.find((f) => !hasValue(content[f]));
  if (missingRequired) return missingRequired;
  return schema.optional.find((f) => !hasValue(content[f])) || null;
}

export function isFieldRequired(category, field) {
  return FIELD_SCHEMA[category]?.required.includes(field) ?? false;
}
