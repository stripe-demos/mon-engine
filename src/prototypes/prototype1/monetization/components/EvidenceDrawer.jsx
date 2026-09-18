import { Dialog } from '../../../../sail';
import { Icon } from '../../../../icons/SailIcons';
import { CATEGORY_LABELS, PROVENANCE_LABELS, confidenceLabel } from '../constants';
import { summarizeArtifactContent } from '../contentSummary';

export default function EvidenceDrawer({ artifact, open, onClose }) {
  if (!artifact) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Why are you confident? — ${CATEGORY_LABELS[artifact.category]}`}
      size="large"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <span className="text-heading-small text-default">{artifact.confidence}%</span>
          <span className="text-label-medium text-subdued">— {confidenceLabel(artifact.confidence)}</span>
        </div>

        <section>
          <h3 className="text-label-medium-emphasized text-default mb-1">What we concluded</h3>
          <p className="text-body-medium text-default">
            {summarizeContent(artifact) || 'Not enough information has been gathered yet.'}
          </p>
        </section>

        {artifact.evidence.length > 0 && (
          <section>
            <h3 className="text-label-medium-emphasized text-default mb-2">Evidence</h3>
            <ul className="space-y-2">
              {artifact.evidence.map((ev) => (
                <li key={ev.id} className="rounded-md border border-border p-3 space-y-1">
                  <p className="text-body-small text-default">"{ev.excerpt}"</p>
                  <p className="text-label-small text-subdued">
                    — {ev.sourceName}
                    {ev.pageOrSlide ? `, page ${ev.pageOrSlide}` : ''}
                    {ev.evidenceType === 'user_confirmation' ? ' (confirmed by you)' : ''}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {artifact.assumptions.length > 0 && (
          <section>
            <h3 className="text-label-medium-emphasized text-default mb-2">Assumptions</h3>
            <ul className="space-y-1">
              {artifact.assumptions.map((a, i) => (
                <li key={i} className="flex gap-2 text-body-small text-subdued">
                  <Icon name="info" size="xsmall" className="text-icon-subdued shrink-0 mt-0.5" />
                  {a}
                </li>
              ))}
            </ul>
          </section>
        )}

        {artifact.missingInformation.length > 0 && (
          <section>
            <h3 className="text-label-medium-emphasized text-default mb-2">Missing information</h3>
            <ul className="space-y-1">
              {artifact.missingInformation.map((m, i) => (
                <li key={i} className="flex gap-2 text-body-small text-subdued">
                  <Icon name="warning" size="xsmall" className="text-icon-attention shrink-0 mt-0.5" />
                  {m}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="text-label-medium-emphasized text-default mb-1">Provenance</h3>
          <p className="text-body-small text-subdued">{PROVENANCE_LABELS[artifact.provenance]}</p>
        </section>
      </div>
    </Dialog>
  );
}

function summarizeContent(artifact) {
  return summarizeArtifactContent(artifact.category, artifact.content) || null;
}
