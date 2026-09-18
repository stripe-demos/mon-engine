import { Icon } from '../../../../icons/SailIcons';
import { Button, Switch } from '../../../../sail';

function formatMoney(value, currency = 'usd') {
  if (value === undefined || value === null) return 'Custom';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
}

function EditIconButton({ label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-6 h-6 flex items-center justify-center rounded-md text-icon-subdued hover:bg-offset hover:text-default cursor-pointer"
    >
      <Icon name="edit" size="xsmall" fill="currentColor" />
    </button>
  );
}

export default function PricingPreview({ config, onEditPlan, onEditMarkup, onToggleProvider, highlightedKey = null }) {
  return (
    <div className="space-y-6">
      <div className="grid medium:grid-cols-3 gap-4">
        {config.plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-lg border p-5 flex flex-col gap-3 transition-shadow duration-300 ${
              highlightedKey === `plan:${plan.id}`
                ? 'border-brand bg-surface shadow-[0_0_0_3px_rgba(103,93,255,0.15)]'
                : 'border-border bg-surface'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-heading-small text-default">{plan.name}</h3>
                <p className="text-label-small text-subdued">{plan.audience}</p>
              </div>
              <EditIconButton label={`Edit ${plan.name} plan`} onClick={() => onEditPlan(plan)} />
            </div>

            <p className="text-body-small text-subdued">{plan.description}</p>

            <div>
              <span className="text-display-small text-default">{formatMoney(plan.basePrice, config.currency)}</span>
              {plan.basePrice !== undefined && <span className="text-label-small text-subdued">/{plan.billingCadence === 'custom' ? 'term' : plan.billingCadence}</span>}
            </div>

            <ul className="text-body-small text-default space-y-1.5 flex-1">
              {plan.includedComputeJobs !== undefined && (
                <li className="flex gap-2"><Icon name="check" size="xsmall" className="text-icon-success shrink-0 mt-0.5" fill="currentColor" />{plan.includedComputeJobs.toLocaleString()} included compute jobs</li>
              )}
              {plan.includedAiTokens !== undefined && (
                <li className="flex gap-2"><Icon name="check" size="xsmall" className="text-icon-success shrink-0 mt-0.5" fill="currentColor" />{plan.includedAiTokens.toLocaleString()} included AI tokens</li>
              )}
              {plan.computeUnitPrice !== undefined && plan.computeUnitPrice > 0 && (
                <li className="flex gap-2"><Icon name="check" size="xsmall" className="text-icon-success shrink-0 mt-0.5" fill="currentColor" />${plan.computeUnitPrice}/compute job overage</li>
              )}
              {plan.aiTokenPrice !== undefined && plan.aiTokenPrice > 0 && (
                <li className="flex gap-2"><Icon name="check" size="xsmall" className="text-icon-success shrink-0 mt-0.5" fill="currentColor" />${plan.aiTokenPrice}/AI token overage</li>
              )}
              {plan.benefits.map((b) => (
                <li key={b} className="flex gap-2"><Icon name="check" size="xsmall" className="text-icon-success shrink-0 mt-0.5" fill="currentColor" />{b}</li>
              ))}
            </ul>

            <Button variant={plan.id === 'scale' ? 'primary' : 'secondary'} className="w-full">
              {plan.id === 'enterprise' ? 'Contact sales' : plan.id === 'free' ? 'Start for free' : 'Choose Scale'}
            </Button>
          </div>
        ))}
      </div>

      <div className="grid medium:grid-cols-2 gap-4">
        <div
          className={`rounded-lg border p-4 space-y-3 transition-shadow duration-300 ${
            highlightedKey === 'markup:cloud' ? 'border-brand shadow-[0_0_0_3px_rgba(103,93,255,0.15)]' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label-medium-emphasized text-default">Cloud markup</p>
              <p className="text-label-small text-subdued">Applied to enabled cloud providers</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-heading-xsmall text-default">{config.cloudMarkupPercentage}%</span>
              <EditIconButton label="Edit cloud markup" onClick={() => onEditMarkup('cloud')} />
            </div>
          </div>
          <div className="space-y-2">
            {config.cloudProviders.map((provider) => (
              <Switch
                key={provider.id}
                checked={provider.enabled}
                onChange={() => onToggleProvider('cloud', provider.id)}
                label={provider.name}
                className="w-full"
              />
            ))}
          </div>
        </div>

        <div
          className={`rounded-lg border p-4 space-y-3 transition-shadow duration-300 ${
            highlightedKey === 'markup:ai' ? 'border-brand shadow-[0_0_0_3px_rgba(103,93,255,0.15)]' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label-medium-emphasized text-default">AI markup</p>
              <p className="text-label-small text-subdued">Applied to enabled AI providers</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-heading-xsmall text-default">{config.aiMarkupPercentage}%</span>
              <EditIconButton label="Edit AI markup" onClick={() => onEditMarkup('ai')} />
            </div>
          </div>
          <div className="space-y-2">
            {config.aiProviders.map((provider) => (
              <Switch
                key={provider.id}
                checked={provider.enabled}
                onChange={() => onToggleProvider('ai', provider.id)}
                label={provider.name}
                className="w-full"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { formatMoney };
