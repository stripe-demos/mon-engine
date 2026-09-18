import { useState } from 'react';
import { Dialog, Button } from '../../../../sail';
import { Icon } from '../../../../icons/SailIcons';
import DocumentDropzone from './DocumentDropzone';
import { isValidUrl, analyzeUrl } from '../extraction';
import { useMonetization } from '../MonetizationContext';

const MODES = [
  { id: 'document', label: 'Upload a document', icon: 'upload' },
  { id: 'url', label: 'Website URL', icon: 'link' },
];

export default function AddReferenceDialog({ open, onClose }) {
  const { addReferenceSource } = useMonetization();
  const [mode, setMode] = useState('document');
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [documentResult, setDocumentResult] = useState(null);

  const urlValid = isValidUrl(url);
  const canAdd = (mode === 'document' && Boolean(documentResult?.text)) || (mode === 'url' && urlValid);

  const reset = () => {
    setMode('document');
    setUrl('');
    setUrlError('');
    setDocumentResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = async () => {
    if (mode === 'document' && documentResult) {
      addReferenceSource({
        id: `ref_${Date.now()}`,
        type: 'document',
        name: documentResult.file.name,
        rawText: documentResult.text,
      });
      handleClose();
      return;
    }
    if (mode === 'url' && urlValid) {
      setUrlLoading(true);
      setUrlError('');
      try {
        const result = await analyzeUrl(url);
        if (result.demoLimitation) {
          setUrlError(result.message);
          return;
        }
        addReferenceSource({ id: `ref_${Date.now()}`, type: 'url', name: url, rawText: result.text });
        handleClose();
      } finally {
        setUrlLoading(false);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add a reference"
      size="small"
      overlayClassName="z-[101]"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!canAdd || urlLoading}>{urlLoading ? 'Reading…' : 'Add reference'}</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-body-small text-subdued">
          Add another document or website. Anything new fills in gaps in your context — it won't override what's
          already confirmed.
        </p>

        <div role="tablist" aria-label="Reference source" className="flex gap-1 p-1 rounded-lg bg-offset">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-label-small-emphasized cursor-pointer transition-colors ${
                mode === m.id ? 'bg-surface text-default shadow-sm' : 'text-subdued hover:text-default'
              }`}
            >
              <Icon name={m.icon} size="xsmall" className={mode === m.id ? 'text-brand shrink-0' : 'text-icon-subdued shrink-0'} />
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'document' && <DocumentDropzone onExtracted={setDocumentResult} />}

        {mode === 'url' && (
          <div className="space-y-2">
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
              placeholder="acme.dev"
              aria-label="Website URL"
              className="w-full h-10 px-3 rounded-md border border-border text-body-medium bg-surface text-default outline-none focus:ring-4 focus:ring-[rgba(8,142,249,0.2)]"
            />
            <p className="text-label-small text-subdued">
              Try <button type="button" className="text-brand hover:underline" onClick={() => setUrl('acme.dev')}>acme.dev</button> for a seeded demo result — live retrieval isn't connected yet.
            </p>
            {urlError && <p className="text-label-small text-critical" role="alert">{urlError}</p>}
          </div>
        )}
      </div>
    </Dialog>
  );
}
