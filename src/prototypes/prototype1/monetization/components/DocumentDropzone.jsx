import { useCallback, useRef, useState } from 'react';
import { Icon } from '../../../../icons/SailIcons';
import { Button } from '../../../../sail';
import { validateFile, extractTextFromFile, SUPPORTED_EXTENSIONS } from '../extraction';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentDropzone({ onExtracted }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | extracting | success | error
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [extractedText, setExtractedText] = useState('');

  const process = useCallback(async (selected) => {
    setError('');
    const validation = validateFile(selected);
    if (!validation.ok) {
      setFile(selected);
      setStatus('error');
      setError(validation.error);
      return;
    }
    setFile(selected);
    setStatus('extracting');
    try {
      const result = await extractTextFromFile(selected);
      setExtractedText(result.text);
      setStatus('success');
      onExtracted?.({ text: result.text, pages: result.pages, file: selected });
    } catch (err) {
      setStatus('error');
      setError(err.message || 'This file could not be read.');
      onExtracted?.(null);
    }
  }, [onExtracted]);

  const handleFiles = useCallback((files) => {
    const selected = files?.[0];
    if (!selected) return;
    process(selected);
  }, [process]);

  const handleRemove = useCallback(() => {
    setFile(null);
    setStatus('idle');
    setError('');
    setExtractedText('');
    onExtracted?.(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onExtracted]);

  const handleRetry = useCallback(() => {
    if (file) process(file);
  }, [file, process]);

  if (file) {
    return (
      <div
        className={`rounded-lg border p-4 space-y-3 ${status === 'error' ? 'border-critical bg-critical/5' : 'border-border bg-offset'}`}
        role="status"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-surface border border-border flex items-center justify-center shrink-0">
            <Icon name="document" size="small" className="text-icon-subdued" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-medium-emphasized text-default truncate">{file.name}</p>
            <p className="text-label-small text-subdued">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label={`Remove ${file.name}`}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface text-icon-subdued cursor-pointer"
          >
            <Icon name="cancel" size="xsmall" fill="currentColor" />
          </button>
        </div>

        {status === 'extracting' && (
          <div className="flex items-center gap-2 text-label-small text-subdued" aria-live="polite">
            <Icon name="spinner" size="xsmall" className="animate-spin text-icon-subdued" />
            Extracting text…
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-label-small text-default" aria-live="polite">
              <Icon name="checkCircleFilled" size="xsmall" className="text-icon-success" fill="currentColor" />
              Extracted {extractedText.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
            </div>
            <label className="text-label-small text-brand cursor-pointer hover:underline">
              Replace file
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept={SUPPORTED_EXTENSIONS.join(',')}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-2">
            <p className="text-label-small text-critical" role="alert">{error}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleRetry}>Retry</Button>
              <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
                Choose a different file
              </Button>
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept={SUPPORTED_EXTENSIONS.join(',')}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="mon-engine-file-input"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-brand bg-brand-50' : 'border-border hover:bg-offset'}`}
      >
        <Icon name="upload" size="medium" className="text-icon-subdued" />
        <p className="text-body-medium-emphasized text-default">
          Drag and drop a file, or click to choose one
        </p>
        <p className="text-label-small text-subdued">
          PDF, DOCX, TXT, or Markdown — up to 10MB
        </p>
        <input
          ref={inputRef}
          id="mon-engine-file-input"
          type="file"
          className="sr-only"
          accept={SUPPORTED_EXTENSIONS.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
    </div>
  );
}
