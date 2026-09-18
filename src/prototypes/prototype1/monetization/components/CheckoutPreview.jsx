import { Icon } from '../../../../icons/SailIcons';
import { Button, Select } from '../../../../sail';
import { formatMoney } from './PricingPreview';
import { computeUsageCost } from '../usageMath';

export default function CheckoutPreview({ config, selectedPlanId, onSelectPlan, usage, onEditUsage, highlighted = false }) {
  const plan = config.plans.find((p) => p.id === selectedPlanId) || config.plans[0];
  const costs = computeUsageCost(plan, config, usage);

  return (
    <div
      className={`max-w-[480px] rounded-lg border bg-surface p-5 space-y-4 transition-shadow duration-300 ${
        highlighted ? 'border-brand shadow-[0_0_0_3px_rgba(103,93,255,0.15)]' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-heading-small text-default">Checkout preview</h3>
        <button
          type="button"
          aria-label="Edit estimated usage for checkout"
          onClick={onEditUsage}
          className="w-6 h-6 flex items-center justify-center rounded-md text-icon-subdued hover:bg-offset hover:text-default cursor-pointer"
        >
          <Icon name="edit" size="xsmall" fill="currentColor" />
        </button>
      </div>

      <Select
        label="Plan"
        value={selectedPlanId}
        onChange={(e) => onSelectPlan(e.target.value)}
      >
        {config.plans.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>

      <div className="space-y-1.5 text-body-small">
        <div className="flex justify-between text-default">
          <span>{plan.name} plan {plan.basePrice ? `(${plan.billingCadence})` : ''}</span>
          <span>{formatMoney(plan.basePrice, config.currency)}</span>
        </div>
        <div className="flex justify-between text-subdued">
          <span>Included compute jobs</span>
          <span>{plan.includedComputeJobs?.toLocaleString() ?? 'Custom'}</span>
        </div>
        <div className="flex justify-between text-subdued">
          <span>Included AI tokens</span>
          <span>{plan.includedAiTokens?.toLocaleString() ?? 'Custom'}</span>
        </div>
        <div className="flex justify-between text-subdued">
          <span>Estimated usage</span>
          <span>{usage.computeJobs.toLocaleString()} jobs, {usage.aiTokens.toLocaleString()} tokens</span>
        </div>
        {costs.computeOverageUnits > 0 && (
          <div className="flex justify-between text-default">
            <span>Compute overage ({costs.computeOverageUnits.toLocaleString()} jobs, incl. {config.cloudMarkupPercentage}% markup)</span>
            <span>{formatMoney(costs.computeTotal, config.currency)}</span>
          </div>
        )}
        {costs.aiOverageUnits > 0 && (
          <div className="flex justify-between text-default">
            <span>AI overage ({costs.aiOverageUnits.toLocaleString()} tokens, incl. {config.aiMarkupPercentage}% markup)</span>
            <span>{formatMoney(costs.aiTotal, config.currency)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-3 space-y-1">
        <div className="flex justify-between text-body-small text-subdued">
          <span>Subtotal</span>
          <span>{formatMoney(costs.subtotal, config.currency)}</span>
        </div>
        <div className="flex justify-between text-label-large-emphasized text-default">
          <span>Estimated total</span>
          <span>{formatMoney(costs.total, config.currency)}</span>
        </div>
      </div>

      <Button className="w-full" disabled>
        Complete purchase (demo only)
      </Button>
      <p className="text-label-small text-subdued text-center">This is a demo preview — no payment is processed.</p>
    </div>
  );
}
