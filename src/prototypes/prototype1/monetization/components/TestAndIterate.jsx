import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Button } from '../../../../sail';
import { useBasePath } from '../../../../contexts/BasePath';
import StageNav from './StageNav';
import MonetizationShell from './MonetizationShell';
import PricingPreview from './PricingPreview';
import CheckoutPreview from './CheckoutPreview';
import InvoicePreview from './InvoicePreview';
import EditFieldDialog from './EditFieldDialog';
import { useMonetization } from '../MonetizationContext';

const TABS = [
  { key: 'pricing', label: 'Pricing page' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'invoice', label: 'Invoice' },
];

export default function TestAndIterate() {
  const { config, applyConfigEdit } = useMonetization();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [activeTab, setActiveTab] = useState('pricing');
  const [selectedPlanId, setSelectedPlanId] = useState('scale');
  const [usage, setUsage] = useState({ computeJobs: 800, aiTokens: 3_500_000 });
  const [dialog, setDialog] = useState(null);

  if (!config) {
    return (
      <div>
        <StageNav />
        <div className="rounded-lg border border-dashed border-border p-10 text-center space-y-3">
          <p className="text-body-medium text-subdued">
            There's no proposed configuration yet. Go back to Context and answer the pricing question to generate one.
          </p>
          <Button variant="secondary" onClick={() => navigate(basePath || '/')}>Back to Context</Button>
        </div>
      </div>
    );
  }

  const openEditPlan = (plan) => {
    setDialog({
      title: `Edit ${plan.name} plan`,
      highlightKey: `plan:${plan.id}`,
      fields: [
        { key: 'name', label: 'Plan name', value: plan.name, required: true },
        { key: 'description', label: 'Description', value: plan.description, type: 'textarea' },
        { key: 'audience', label: 'Target customer', value: plan.audience },
        { key: 'basePrice', label: 'Base price (USD)', value: plan.basePrice ?? 0, type: 'number' },
        { key: 'includedComputeJobs', label: 'Included compute jobs', value: plan.includedComputeJobs ?? 0, type: 'number' },
        { key: 'includedAiTokens', label: 'Included AI tokens', value: plan.includedAiTokens ?? 0, type: 'number' },
        { key: 'computeUnitPrice', label: 'Compute overage rate (USD/job)', value: plan.computeUnitPrice ?? 0, type: 'number' },
        { key: 'aiTokenPrice', label: 'AI overage rate (USD/token)', value: plan.aiTokenPrice ?? 0, type: 'number' },
        { key: 'benefits', label: 'Benefits (one per line)', value: plan.benefits.join('\n'), type: 'textarea' },
      ],
      onSave: (values) => {
        applyConfigEdit(
          (prev) => ({
            ...prev,
            plans: prev.plans.map((p) => (p.id === plan.id
              ? { ...p, ...values, benefits: String(values.benefits).split('\n').map((b) => b.trim()).filter(Boolean) }
              : p)),
          }),
          `I updated the ${plan.name} plan. The pricing page, checkout estimate, and sample invoice now use the new details.`
        );
        setDialog(null);
      },
    });
  };

  const openEditMarkup = (kind) => {
    const key = kind === 'cloud' ? 'cloudMarkupPercentage' : 'aiMarkupPercentage';
    const label = kind === 'cloud' ? 'Cloud markup' : 'AI markup';
    setDialog({
      title: `Edit ${label.toLowerCase()}`,
      highlightKey: `markup:${kind}`,
      fields: [{ key, label, value: config[key], type: 'percentage', required: true }],
      onSave: (values) => {
        const previous = config[key];
        applyConfigEdit(
          (prev) => ({ ...prev, [key]: values[key] }),
          `I updated the ${label.toLowerCase()} from ${previous}% to ${values[key]}%. The pricing page, checkout estimate, and sample invoice now use the new markup.`
        );
        setDialog(null);
      },
    });
  };

  const toggleProvider = (kind, providerId) => {
    const key = kind === 'cloud' ? 'cloudProviders' : 'aiProviders';
    const provider = config[key].find((p) => p.id === providerId);
    applyConfigEdit(
      (prev) => ({
        ...prev,
        [key]: prev[key].map((p) => (p.id === providerId ? { ...p, enabled: !p.enabled } : p)),
      }),
      `I ${provider.enabled ? 'disabled' : 'enabled'} ${provider.name} as a ${kind === 'cloud' ? 'cloud' : 'AI'} provider.`
    );
  };

  const openEditUsage = () => {
    setDialog({
      title: 'Edit estimated usage',
      highlightKey: 'usage',
      fields: [
        { key: 'computeJobs', label: 'Compute jobs', value: usage.computeJobs, type: 'number' },
        { key: 'aiTokens', label: 'AI tokens', value: usage.aiTokens, type: 'number' },
      ],
      onSave: (values) => {
        setUsage(values);
        setDialog(null);
      },
    });
  };

  const highlightedKey = dialog?.highlightKey ?? null;

  return (
    <MonetizationShell>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="pt-4">
          {activeTab === 'pricing' && (
            <PricingPreview
              config={config}
              onEditPlan={openEditPlan}
              onEditMarkup={openEditMarkup}
              onToggleProvider={toggleProvider}
              highlightedKey={highlightedKey}
            />
          )}
          {activeTab === 'checkout' && (
            <CheckoutPreview
              config={config}
              selectedPlanId={selectedPlanId}
              onSelectPlan={setSelectedPlanId}
              usage={usage}
              onEditUsage={openEditUsage}
              highlighted={highlightedKey === 'usage'}
            />
          )}
          {activeTab === 'invoice' && (
            <InvoicePreview
              config={config}
              selectedPlanId={selectedPlanId}
              usage={usage}
              onEditUsage={openEditUsage}
              highlighted={highlightedKey === 'usage'}
            />
          )}
        </div>
      </Tabs>

      <EditFieldDialog
        open={Boolean(dialog)}
        title={dialog?.title}
        fields={dialog?.fields || []}
        onSave={(values) => dialog?.onSave(values)}
        onCancel={() => setDialog(null)}
      />
    </MonetizationShell>
  );
}
