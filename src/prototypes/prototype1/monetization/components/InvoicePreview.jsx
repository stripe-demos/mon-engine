import { Icon } from '../../../../icons/SailIcons';
import { formatMoney } from './PricingPreview';
import { computeUsageCost } from '../usageMath';

export default function InvoicePreview({ config, selectedPlanId, usage, onEditUsage, highlighted = false }) {
  const plan = config.plans.find((p) => p.id === selectedPlanId) || config.plans[0];
  const costs = computeUsageCost(plan, config, usage);

  const period = 'Sep 1 – Sep 30, 2026';

  return (
    <div
      className={`max-w-[560px] rounded-lg border bg-surface p-6 space-y-5 transition-shadow duration-300 ${
        highlighted ? 'border-brand shadow-[0_0_0_3px_rgba(103,93,255,0.15)]' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-label-small text-subdued uppercase tracking-wide">Sample invoice — preview only</p>
          <h3 className="text-heading-small text-default">Acme DevOps, Inc.</h3>
        </div>
        <button
          type="button"
          aria-label="Edit sample invoice usage quantities"
          onClick={onEditUsage}
          className="w-6 h-6 flex items-center justify-center rounded-md text-icon-subdued hover:bg-offset hover:text-default cursor-pointer"
        >
          <Icon name="edit" size="xsmall" fill="currentColor" />
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-body-small">
        <dt className="text-subdued">Customer</dt>
        <dd className="text-default text-right">cus_devops_demo</dd>
        <dt className="text-subdued">Billing period</dt>
        <dd className="text-default text-right">{period}</dd>
        <dt className="text-subdued">Plan</dt>
        <dd className="text-default text-right">{plan.name}</dd>
      </dl>

      <table className="w-full text-body-small">
        <thead>
          <tr className="border-b border-border text-subdued text-left">
            <th className="py-1.5 font-normal">Line item</th>
            <th className="py-1.5 font-normal text-right">Qty</th>
            <th className="py-1.5 font-normal text-right">Rate</th>
            <th className="py-1.5 font-normal text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="text-default">
          {plan.basePrice > 0 && (
            <tr className="border-b border-border">
              <td className="py-2">{plan.name} plan subscription</td>
              <td className="py-2 text-right">1</td>
              <td className="py-2 text-right">{formatMoney(plan.basePrice, config.currency)}</td>
              <td className="py-2 text-right">{formatMoney(plan.basePrice, config.currency)}</td>
            </tr>
          )}
          <tr className="border-b border-border">
            <td className="py-2">Compute jobs started</td>
            <td className="py-2 text-right">{usage.computeJobs.toLocaleString()}</td>
            <td className="py-2 text-right">{plan.computeUnitPrice ? `$${plan.computeUnitPrice}` : '—'}</td>
            <td className="py-2 text-right">{formatMoney(costs.computeTotal, config.currency)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2">AI tokens consumed</td>
            <td className="py-2 text-right">{usage.aiTokens.toLocaleString()}</td>
            <td className="py-2 text-right">{plan.aiTokenPrice ? `$${plan.aiTokenPrice}` : '—'}</td>
            <td className="py-2 text-right">{formatMoney(costs.aiTotal, config.currency)}</td>
          </tr>
          {costs.cloudMarkupAmount > 0 && (
            <tr className="border-b border-border text-subdued">
              <td className="py-2">Cloud markup ({config.cloudMarkupPercentage}%)</td>
              <td className="py-2 text-right">—</td>
              <td className="py-2 text-right">—</td>
              <td className="py-2 text-right">{formatMoney(costs.cloudMarkupAmount, config.currency)}</td>
            </tr>
          )}
          {costs.aiMarkupAmount > 0 && (
            <tr className="border-b border-border text-subdued">
              <td className="py-2">AI markup ({config.aiMarkupPercentage}%)</td>
              <td className="py-2 text-right">—</td>
              <td className="py-2 text-right">—</td>
              <td className="py-2 text-right">{formatMoney(costs.aiMarkupAmount, config.currency)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="space-y-1 ml-auto w-fit min-w-[200px]">
        <div className="flex justify-between text-body-small text-subdued gap-6">
          <span>Subtotal</span>
          <span>{formatMoney(costs.subtotal, config.currency)}</span>
        </div>
        <div className="flex justify-between text-label-large-emphasized text-default gap-6">
          <span>Total</span>
          <span>{formatMoney(costs.total, config.currency)}</span>
        </div>
      </div>
    </div>
  );
}
