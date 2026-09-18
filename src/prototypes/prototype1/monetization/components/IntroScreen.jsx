import { useEffect, useId, useState } from 'react';
import { Icon } from '../../../../icons/SailIcons';
import { Button, Textarea } from '../../../../sail';
import DocumentDropzone from './DocumentDropzone';
import { isValidUrl, analyzeUrl } from '../extraction';
import { MIN_DESCRIPTION_LENGTH, EXAMPLE_BUSINESS_DESCRIPTION } from '../constants';

const MODES = [
  { id: 'url', label: 'Website URL', icon: 'link' },
  { id: 'description', label: 'Describe your business', icon: 'note' },
  { id: 'document', label: 'Upload a document', icon: 'upload' },
];

// Fake upload/build sequence shown for a few seconds after submit, so the
// transition into the workspace feels like real work is happening rather
// than an instant cut.
const UPLOAD_STEPS = [
  { label: 'Reading what you shared…', duration: 900 },
  { label: 'Structuring your business context…', duration: 900 },
  { label: 'Building your monetization engine…', duration: 1200 },
];
const TOTAL_UPLOAD_MS = UPLOAD_STEPS.reduce((sum, step) => sum + step.duration, 0);

function UploadingView({ sourceName }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progressStarted, setProgressStarted] = useState(false);

  useEffect(() => {
    const timeouts = [];
    let cursor = 0;
    UPLOAD_STEPS.forEach((step, i) => {
      if (i > 0) {
        timeouts.push(setTimeout(() => setStepIndex(i), cursor));
      }
      cursor += step.duration;
    });
    timeouts.push(setTimeout(() => setProgressStarted(true), 20));
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center text-center gap-5 py-14">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
        <Icon name="spinner" size="large" className="text-brand animate-spin" />
      </div>
      <div className="space-y-1.5">
        <p className="text-heading-small text-default">{UPLOAD_STEPS[stepIndex].label}</p>
        {sourceName && <p className="text-body-small text-subdued truncate max-w-[360px]">{sourceName}</p>}
      </div>
      <div className="w-full max-w-[320px] h-1.5 rounded-full bg-offset overflow-hidden">
        <div
          className="h-full rounded-full bg-brand transition-[width] ease-out"
          style={{ width: progressStarted ? '100%' : '4%', transitionDuration: `${TOTAL_UPLOAD_MS}ms` }}
        />
      </div>
    </div>
  );
}

export default function IntroScreen({ onSubmit }) {
  const [mode, setMode] = useState('description');
  const [url, setUrl] = useState('');
  const [urlTouched, setUrlTouched] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [description, setDescription] = useState('');
  const [documentResult, setDocumentResult] = useState(null);
  const [pendingSource, setPendingSource] = useState(null);
  const descId = useId();
  const urlId = useId();

  const urlValid = isValidUrl(url);
  const descriptionValid = description.trim().length >= MIN_DESCRIPTION_LENGTH;
  const documentValid = Boolean(documentResult?.text);

  const canContinue =
    (mode === 'url' && urlValid) ||
    (mode === 'description' && descriptionValid) ||
    (mode === 'document' && documentValid);

  useEffect(() => {
    if (!pendingSource) return;
    const timeout = setTimeout(() => onSubmit(pendingSource), TOTAL_UPLOAD_MS);
    return () => clearTimeout(timeout);
  }, [pendingSource, onSubmit]);

  const handleContinue = async () => {
    if (mode === 'description') {
      setPendingSource({ id: `src_${Date.now()}`, type: 'description', name: 'Business description', rawText: description.trim(), extractionStatus: 'complete' });
      return;
    }
    if (mode === 'document') {
      setPendingSource({
        id: `src_${Date.now()}`,
        type: 'document',
        name: documentResult.file.name,
        mimeType: documentResult.file.type,
        size: documentResult.file.size,
        rawText: documentResult.text,
        extractionStatus: 'complete',
      });
      return;
    }
    if (mode === 'url') {
      if (!urlValid) return;
      setUrlLoading(true);
      setUrlError('');
      try {
        const result = await analyzeUrl(url);
        if (result.demoLimitation) {
          setUrlError(result.message);
          return;
        }
        setPendingSource({ id: `src_${Date.now()}`, type: 'url', name: url, url, rawText: result.text, extractionStatus: 'complete' });
      } finally {
        setUrlLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[45] overflow-hidden bg-surface">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Soft diagonal "wave" bands in blue/purple/teal, layered like stripe.com/billing's hero */}
        <div
          className="absolute -top-1/3 -left-1/4 w-[150%] h-[75%] rotate-[-10deg] blur-3xl opacity-80"
          style={{
            background:
              'linear-gradient(115deg, rgba(99,91,255,0.38) 0%, rgba(80,130,255,0.30) 35%, rgba(45,212,191,0.22) 65%, rgba(45,212,191,0) 100%)',
          }}
        />
        <div
          className="absolute top-[6%] -right-1/3 w-[95%] h-[65%] rotate-[8deg] blur-3xl opacity-70"
          style={{
            background: 'radial-gradient(closest-side, rgba(167,139,250,0.38), rgba(167,139,250,0) 70%)',
          }}
        />
        <div
          className="absolute bottom-[-25%] left-[15%] w-[85%] h-[55%] rotate-[4deg] blur-3xl opacity-60"
          style={{
            background: 'radial-gradient(closest-side, rgba(45,212,191,0.28), rgba(45,212,191,0) 70%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/10 via-transparent to-surface/80" />
      </div>
      <div className="relative h-full overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-[560px] space-y-8 rounded-2xl bg-surface/80 backdrop-blur-sm border border-border/60 shadow-lg px-8 py-10">
            {pendingSource ? (
              <UploadingView sourceName={pendingSource.name} />
            ) : (
              <>
          <div className="space-y-2 text-center">
            <div className="mx-auto w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-2">
              <Icon name="growth" size="medium" className="text-brand" />
            </div>
            <h1 className="text-display-small text-default">Tell us about your business</h1>
            <p className="text-body-medium text-subdued max-w-[440px] mx-auto">
              Share your website, describe your business, or upload a document. We'll use it to build your
              business context and propose a monetization model.
            </p>
          </div>

          <div role="tablist" aria-label="Business context source" className="flex gap-1 p-1 rounded-lg bg-offset">
            {MODES.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`flex-1 flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-1 py-2 text-label-small-emphasized cursor-pointer transition-colors ${
                  mode === m.id ? 'bg-surface text-default shadow-sm' : 'text-subdued hover:text-default'
                }`}
              >
                <Icon name={m.icon} size="xsmall" className={mode === m.id ? 'text-brand shrink-0' : 'text-icon-subdued shrink-0'} />
                {m.label}
              </button>
            ))}
          </div>

          <div className="min-h-[220px]">
            {mode === 'url' && (
              <div className="space-y-2" role="tabpanel">
                <label htmlFor={urlId} className="block text-label-medium-emphasized text-default">
                  Website URL
                </label>
                <input
                  id={urlId}
                  type="url"
                  inputMode="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
                  onBlur={() => setUrlTouched(true)}
                  placeholder="acme.dev"
                  aria-invalid={urlTouched && url.length > 0 && !urlValid}
                  aria-describedby={`${urlId}-hint`}
                  className={`w-full h-10 px-3 rounded-md border text-body-medium bg-surface text-default outline-none focus:ring-4 focus:ring-[rgba(8,142,249,0.2)] ${
                    urlTouched && url.length > 0 && !urlValid ? 'border-critical' : 'border-border'
                  }`}
                />
                <p id={`${urlId}-hint`} className="text-label-small text-subdued">
                  Try <button type="button" className="text-brand hover:underline" onClick={() => setUrl('acme.dev')}>acme.dev</button> for a seeded demo result — live retrieval isn't connected yet.
                </p>
                {urlTouched && url.length > 0 && !urlValid && (
                  <p className="text-label-small text-critical" role="alert">Enter a valid URL, like acme.com.</p>
                )}
                {urlError && (
                  <p className="text-label-small text-critical" role="alert">{urlError}</p>
                )}
              </div>
            )}

            {mode === 'description' && (
              <div className="space-y-2" role="tabpanel">
                <div className="flex items-center justify-between">
                  <label htmlFor={descId} className="block text-label-medium-emphasized text-default">
                    Describe your business
                  </label>
                  <button
                    type="button"
                    className="text-label-small text-brand hover:underline cursor-pointer"
                    onClick={() => setDescription(EXAMPLE_BUSINESS_DESCRIPTION)}
                  >
                    Use example
                  </button>
                </div>
                <Textarea
                  id={descId}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does your product do, who buys it, and how are they charged today?"
                  rows={7}
                  className="w-full"
                />
                <p className="text-label-small text-subdued">
                  {description.trim().length}/{MIN_DESCRIPTION_LENGTH} characters minimum
                </p>
              </div>
            )}

            {mode === 'document' && (
              <div role="tabpanel">
                <DocumentDropzone onExtracted={setDocumentResult} />
              </div>
            )}
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!canContinue || urlLoading}
            onClick={handleContinue}
          >
            {urlLoading ? 'Reading…' : 'Continue'}
          </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
