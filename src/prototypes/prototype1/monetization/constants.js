// Shared constants for the Monetization Engine onboarding flow.
// Centralized so thresholds and defaults aren't scattered as magic numbers.

export const CONTEXT_CATEGORIES = [
  'business_details',
  'business_model',
  'value_proposition',
  'what_you_sell',
  'pricing_and_packaging',
];

export const CATEGORY_LABELS = {
  business_details: 'Business details',
  business_model: 'Business model',
  value_proposition: 'Value proposition',
  what_you_sell: 'What you sell',
  pricing_and_packaging: 'Pricing and packaging',
};

export const STAGES = ['context', 'test_and_iterate', 'update_your_code'];

export const STAGE_LABELS = {
  context: 'Context',
  test_and_iterate: 'Test and iterate',
  update_your_code: 'Update your code',
};

// Confidence label thresholds — keep configurable in one place.
export const CONFIDENCE_THRESHOLDS = {
  high: 80,
  medium: 50,
};

export function confidenceLabel(confidence) {
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return 'High confidence';
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return 'Medium confidence';
  return 'Low confidence';
}

export const ARTIFACT_STATUS_LABELS = {
  waiting: 'Waiting',
  analyzing: 'Analyzing',
  needs_information: 'Needs information',
  ready: 'Ready',
  updated: 'Updated',
};

export const PROVENANCE_LABELS = {
  extracted: 'Extracted from source',
  inferred: 'Inferred',
  recommended: 'Recommended',
  user_confirmed: 'Confirmed by you',
};

// Pricing defaults per the product spec.
export const DEFAULT_CLOUD_MARKUP = 15;
export const DEFAULT_AI_MARKUP = 20;

export const DEFAULT_CLOUD_PROVIDERS = [
  { id: 'aws', name: 'AWS', enabled: true },
  { id: 'cloudflare', name: 'Cloudflare', enabled: true },
  { id: 'microsoft', name: 'Microsoft', enabled: true },
];

export const DEFAULT_AI_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', enabled: true },
  { id: 'openai', name: 'OpenAI', enabled: true },
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MIN_DESCRIPTION_LENGTH = 40;

export const SUPPORTED_DOCUMENT_TYPES = [
  { ext: '.pdf', mime: 'application/pdf', label: 'PDF' },
  { ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX' },
  { ext: '.txt', mime: 'text/plain', label: 'TXT' },
  { ext: '.md', mime: 'text/markdown', label: 'Markdown' },
];

export const EXAMPLE_BUSINESS_DESCRIPTION =
  "We're building a DevOps suite that helps engineering teams run cloud compute jobs and use AI to analyze deployments, logs, and incidents. Customers range from individual developers experimenting with the product to scaling engineering organizations and large enterprises with security, support, and procurement requirements.";

// Exact question text asked in chat for each field, keyed by category then field.
// Used to drive the one-question-at-a-time follow-up flow.
export const FIELD_QUESTIONS = {
  business_details: {
    companyName: 'What is your company called?',
    companyLocation: 'Where is your company located?',
    serviceableMarkets: 'What markets and geographies do you serve?',
    yearFounded: 'What year was your company founded?',
    businessWebsite: 'What is your business website?',
    linkedinProfile: 'What is your LinkedIn profile?',
    investorsOrCrunchbase: 'Do you have known investors or a Crunchbase profile you can share?',
    sampleInvoiceUpload: 'Would you like to upload a sample invoice?',
    invoiceFormattingRequirements: 'Are there specific invoice formatting or presentation requirements?',
  },
  business_model: {
    serviceDeliveryModel: 'What is your preferred service-delivery model?',
    targetPersonas: 'Who are your target personas or ideal customer profiles (ICPs)?',
    salesMotion: 'What does your sales motion look like — product-led growth (PLG), sales-led growth (SLG), or hybrid?',
    primaryCOGS: 'What are your primary costs of goods sold (COGS)?',
    enterpriseMonetization: 'How do you monetize commercial or enterprise customers?',
    currentPaymentTiming: 'How do customers pay today — prepaid, postpaid, pay as you go, subscription, or hybrid?',
    upgradeCadence: 'Do customers upgrade immediately or only at the end of their contract term?',
    subscriptionToUsageTransition: 'Are you currently subscription-based but looking to introduce usage-based pricing?',
  },
  value_proposition: {
    valueProvided: 'What value do you provide to your customers? (Example: "We help our customers create videos.")',
    valueEmphasis: 'What value do you emphasize in your sales and marketing materials?',
    customerOutcomes: 'What outcomes do customers achieve by using your product?',
    wantsHelpDefining: 'Would you like help defining your value proposition?',
    comparableCompanies: 'Are there comparable companies whose value proposition or model you want to adapt?',
  },
  what_you_sell: {
    offeringType: 'Do you sell a product, a service, or both?',
    offeringNames: 'What are the names of your products, services, plans, or packages?',
    whatCustomerReceives: 'What specifically does the customer receive? (Example: compute time, workflows, API calls, seats, or completed outcomes)',
    meteredActivity: 'What product activity or customer usage would you want to meter?',
    meterDurability: 'How durable are those meters — do they represent the long-term value customers receive? (Example: you currently meter workflows but ultimately want to charge for outcomes.)',
    seatsOrFixedUnit: 'Are seats or another fixed unit part of the product offering?',
  },
  pricing_and_packaging: {
    pricingGuidanceLevel: 'How much pricing guidance would you like?',
    currentPricingApproach: 'How do you currently price and package your products?',
    pricePerOffering: 'What is the price of each product, service, plan, or package?',
    pricingModels: 'Which pricing models do you use or want to use — subscription, usage-based, pay as you go, prepaid commitment, postpaid, seat-based, outcome-based, or hybrid?',
    billingPeriod: 'What billing period or contract term applies to each offering?',
    usageMeters: 'What meters determine usage and charges?',
    includedUsageAllocations: 'Do you provide included usage or allocations?',
    pricingAnchor: 'Do you anchor pricing on seats, usage, outcomes, or another value metric?',
    promotionsAndDiscounts: 'Do you offer promotions, discounts, credits, trials, or negotiated pricing?',
    additionalPricingLayers: 'What additional pricing layers are required — minimum commitments, overage rates, tiered or volume pricing, spend caps, credits or allocations, or enterprise terms?',
    upgradeCadence: 'Can customers upgrade immediately, or only when their current term ends?',
    subscriptionToUsageTransition: 'Are you looking to move from SaaS-style subscription pricing to usage-based or hybrid pricing?',
    invoiceLineItemStructure: 'What information and line-item structure must appear on the invoice?',
    sampleInvoiceUpload: 'Would you like to upload a sample invoice?',
    pricingComparableCompany: "Which company's pricing model would you like to start from?",
  },
};

// Fields answered via discrete action buttons instead of free text.
export const FIELD_OPTIONS = {
  pricing_and_packaging: {
    pricingGuidanceLevel: [
      { id: 'configure_existing', label: 'Configure an existing model' },
      { id: 'get_recommendations', label: 'Get recommendations' },
      { id: 'start_from_comparable', label: "Start from a comparable company's model and customize it", recommended: true },
      { id: 'design_from_scratch', label: 'Design a new pricing model from scratch' },
    ],
  },
};

// Short example text shown alongside each follow-up question, so the agent's
// ask feels concrete rather than abstract when the "Add details" flow prompts
// for a field directly.
export const FIELD_EXAMPLES = {
  business_details: {
    companyName: 'e.g. "Acme Inc."',
    companyLocation: 'e.g. "San Francisco, CA" or "Berlin, Germany"',
    serviceableMarkets: 'e.g. "North America and Western Europe" or "Global"',
    yearFounded: 'e.g. "2021"',
    businessWebsite: 'e.g. "acme.com"',
    linkedinProfile: 'e.g. "linkedin.com/company/acme"',
    investorsOrCrunchbase: 'e.g. "Backed by Sequoia; see crunchbase.com/organization/acme"',
    sampleInvoiceUpload: 'Attach a PDF or image of an existing invoice, if you have one',
    invoiceFormattingRequirements: 'e.g. "Must show PO number and cost center"',
  },
  business_model: {
    serviceDeliveryModel: 'e.g. "Self-serve SaaS" or "White-labeled through partners"',
    targetPersonas: 'e.g. "Individual developers, growing engineering teams, and enterprises"',
    salesMotion: 'e.g. "Product-led growth (PLG)" or "Sales-led, with an enterprise team"',
    primaryCOGS: 'e.g. "Cloud compute, AI inference, and third-party API costs"',
    enterpriseMonetization: 'e.g. "Annual contracts with volume discounts and dedicated support"',
    currentPaymentTiming: 'e.g. "Postpaid, billed monthly based on usage"',
    upgradeCadence: 'e.g. "Immediately" or "Only at renewal"',
    subscriptionToUsageTransition: 'e.g. "Yes, we want usage-based pricing alongside our current plans"',
  },
  value_proposition: {
    valueProvided: 'e.g. "We help engineering teams ship faster by automating deployment reviews"',
    valueEmphasis: 'e.g. "Speed and reliability" or "Cost savings vs. building in-house"',
    customerOutcomes: 'e.g. "Faster incident response, fewer failed deploys"',
    wantsHelpDefining: 'e.g. "Yes" or "No, we have this defined already"',
    comparableCompanies: 'e.g. "Datadog" or "Twilio"',
  },
  what_you_sell: {
    offeringType: 'e.g. "Product" or "Product plus managed services"',
    offeringNames: 'e.g. "Starter, Growth, and Enterprise plans"',
    whatCustomerReceives: 'e.g. "API calls, compute minutes, and completed workflows"',
    meteredActivity: 'e.g. "API calls, compute jobs, or AI tokens consumed"',
    meterDurability: 'e.g. "We meter workflows today but want to eventually charge for outcomes"',
    seatsOrFixedUnit: 'e.g. "Yes, priced per seat" or "No, usage-only"',
  },
  pricing_and_packaging: {
    currentPricingApproach: 'e.g. "Flat monthly subscription with three tiers"',
    pricePerOffering: 'e.g. "Starter $49/mo, Growth $199/mo, Enterprise custom"',
    pricingModels: 'e.g. "Subscription with usage-based overages"',
    billingPeriod: 'e.g. "Monthly" or "Annual with quarterly invoicing"',
    usageMeters: 'e.g. "API calls, seats, and storage"',
    includedUsageAllocations: 'e.g. "10,000 included API calls per month"',
    pricingAnchor: 'e.g. "Usage" or "Seats"',
    promotionsAndDiscounts: 'e.g. "14-day free trial, 20% annual discount"',
    additionalPricingLayers: 'e.g. "Minimum commitment of $500/mo, overage at $0.01/call"',
    invoiceLineItemStructure: 'e.g. "One line item per plan, one per usage meter"',
    pricingComparableCompany: 'e.g. "Twilio" or "Datadog"',
  },
};
