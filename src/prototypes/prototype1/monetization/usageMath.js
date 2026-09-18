// Shared usage-cost math so the checkout and invoice previews (and any
// future surface) always compute the same numbers from the same config.

export function computeUsageCost(plan, config, usage) {
  const computeOverageUnits = Math.max(0, (usage.computeJobs || 0) - (plan.includedComputeJobs || 0));
  const aiOverageUnits = Math.max(0, (usage.aiTokens || 0) - (plan.includedAiTokens || 0));

  const computeBase = computeOverageUnits * (plan.computeUnitPrice || 0);
  const aiBase = aiOverageUnits * (plan.aiTokenPrice || 0);

  const cloudMarkupAmount = computeBase * ((config.cloudMarkupPercentage || 0) / 100);
  const aiMarkupAmount = aiBase * ((config.aiMarkupPercentage || 0) / 100);

  const computeTotal = computeBase + cloudMarkupAmount;
  const aiTotal = aiBase + aiMarkupAmount;

  const basePrice = plan.basePrice || 0;
  const subtotal = basePrice + computeBase + aiBase;
  const total = basePrice + computeTotal + aiTotal;

  return {
    computeOverageUnits,
    aiOverageUnits,
    computeBase,
    aiBase,
    cloudMarkupAmount,
    aiMarkupAmount,
    computeTotal,
    aiTotal,
    basePrice,
    subtotal,
    total,
  };
}
