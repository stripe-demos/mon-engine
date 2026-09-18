import { useMemo, useState } from 'react';
import { Icon } from '../../../../icons/SailIcons';
import { Button } from '../../../../sail';
import MonetizationShell from './MonetizationShell';
import { generateClaudeCodePrompt } from '../promptGenerator';
import { useMonetization } from '../MonetizationContext';

export default function UpdateYourCode() {
  const { config } = useMonetization();
  const [copyState, setCopyState] = useState('idle'); // idle | copied | failed

  const prompt = useMemo(() => generateClaudeCodePrompt(config), [config]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    } finally {
      setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  return (
    <MonetizationShell>
      <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-heading-medium text-default">Update your code</h2>
        <p className="text-body-medium text-subdued max-w-[640px]">
          Paste this into Claude Code in your application's repository to instrument the two billable usage
          events — <code className="text-label-small">compute_job_started</code> and{' '}
          <code className="text-label-small">ai_tokens_consumed</code>.
        </p>
      </div>

      <div className="relative rounded-lg border border-border bg-offset">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-label-small text-subdued">Claude Code prompt</span>
          <Button
            size="sm"
            variant="secondary"
            icon={copyState === 'copied' ? 'checkCircleFilled' : 'clipboard'}
            onClick={handleCopy}
            aria-label="Copy Claude Code prompt to clipboard"
          >
            {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed — try again' : 'Copy'}
          </Button>
        </div>
        <pre className="p-4 overflow-x-auto max-h-[560px] text-label-small text-default whitespace-pre-wrap">
          <code>{prompt}</code>
        </pre>
      </div>
      {copyState === 'failed' && (
        <p className="text-label-small text-critical" role="alert">
          Couldn't copy automatically — select the text above and copy it manually.
        </p>
      )}
      </div>
    </MonetizationShell>
  );
}
