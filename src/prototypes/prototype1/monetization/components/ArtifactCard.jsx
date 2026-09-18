import { useState } from 'react';
import { Icon } from '../../../../icons/SailIcons';
import { Badge, Button } from '../../../../sail';
import ProgressBar from './ProgressBar';
import EvidenceDrawer from './EvidenceDrawer';
import { ARTIFACT_STATUS_LABELS, confidenceLabel, CATEGORY_LABELS } from '../constants';
import { humanizeArtifactContent, getFieldBreakdown } from '../contentSummary';

const STATUS_VARIANT = {
  waiting: 'default',
  analyzing: 'info',
  needs_information: 'warning',
  ready: 'success',
  updated: 'info',
};

const STATUS_ICON = {
  waiting: 'clock',
  analyzing: 'spinner',
  needs_information: 'warning',
  ready: 'checkCircleFilled',
  updated: 'refresh',
};

function ArtifactBody({ category, content }) {
  const summary = humanizeArtifactContent(category, content);
  if (!summary) return null;
  return <p className="text-body-small text-default">{summary}</p>;
}

function FieldBreakdown({ category, content }) {
  const rows = getFieldBreakdown(category, content);
  return (
    <div className="pt-2 border-t border-border space-y-2">
      <p className="text-label-small-emphasized text-subdued">What's filled in vs. still needed</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.field} className="flex items-start gap-2">
            <Icon
              key={`${row.field}-${row.present}`}
              name={row.present ? 'checkCircleFilled' : 'circle'}
              size="xxsmall"
              fill="currentColor"
              className={`shrink-0 mt-0.5 ${row.present ? 'text-icon-success [animation:popIn_0.4s_ease-out]' : 'text-icon-subdued'}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-label-small text-default">
                {row.label}
                {row.required && (
                  <span className="text-label-small text-subdued"> · required</span>
                )}
              </p>
              {row.present ? (
                <p className="text-body-small text-subdued">{row.value}</p>
              ) : (
                <p className="text-body-small text-placeholder italic">Missing — needed to reach 100% completeness</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ArtifactCard({ artifact, onPrompt, active = false, flash = false, expanded = false, onToggleExpand }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isEmpty = artifact.status === 'waiting';

  return (
    <div
      id={`artifact-${artifact.category}`}
      className={`rounded-lg border p-4 space-y-3 transition-[box-shadow,border-color,background-color] duration-700 ${
        active ? 'border-brand bg-surface shadow-[0_0_0_3px_rgba(103,93,255,0.15)]' : 'border-border bg-surface'
      } ${flash ? 'border-brand bg-badge-warning-bg shadow-[0_0_0_3px_rgba(103,93,255,0.25)]' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-label-large-emphasized text-default">{artifact.title}</h3>
        <Badge variant={STATUS_VARIANT[artifact.status]} className="flex items-center gap-1">
          <Icon
            name={STATUS_ICON[artifact.status]}
            size="xxsmall"
            fill="currentColor"
            className={artifact.status === 'analyzing' ? 'animate-spin' : ''}
          />
          {ARTIFACT_STATUS_LABELS[artifact.status]}
        </Badge>
      </div>

      {isEmpty ? (
        <p className="text-body-small text-subdued">Waiting for analysis to begin.</p>
      ) : (
        <>
          <ArtifactBody category={artifact.category} content={artifact.content} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-label-small text-subdued">Completeness</span>
                <span className="text-label-small-emphasized text-default">{artifact.completeness}%</span>
              </div>
              <ProgressBar value={artifact.completeness} label={`${CATEGORY_LABELS[artifact.category]} completeness`} active={active} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-label-small text-subdued">Confidence</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="text-label-small-emphasized text-brand hover:underline cursor-pointer"
                >
                  {artifact.confidence}% · {confidenceLabel(artifact.confidence)}
                </button>
              </div>
              <ProgressBar value={artifact.confidence} label={`${CATEGORY_LABELS[artifact.category]} confidence`} variant="confidence" />
            </div>
          </div>

          {artifact.missingInformation.length > 0 && (
            <div className="rounded-md bg-badge-warning-bg border border-badge-warning-border px-3 py-2 flex gap-2">
              <Icon name="warning" size="xsmall" className="text-icon-attention shrink-0 mt-0.5" />
              <p className="text-label-small text-default">
                Needs more information: {artifact.missingInformation.join(', ')}.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex items-center gap-1 text-label-small-emphasized text-subdued hover:text-default cursor-pointer"
            >
              <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size="xxsmall" fill="currentColor" />
              {expanded ? 'Hide details' : 'Show details'}
            </button>
            <Button size="sm" variant="secondary" onClick={() => onPrompt(artifact.category)}>
              {artifact.status === 'ready' ? 'Edit result' : 'Add details'}
            </Button>
          </div>

          {expanded && <FieldBreakdown category={artifact.category} content={artifact.content} />}
        </>
      )}

      <EvidenceDrawer artifact={artifact} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
