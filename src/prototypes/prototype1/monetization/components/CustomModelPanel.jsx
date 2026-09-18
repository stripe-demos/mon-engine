import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../sail';
import { useBasePath } from '../../../../contexts/BasePath';
import { CATEGORY_LABELS } from '../constants';
import { useMonetization } from '../MonetizationContext';

export default function CustomModelPanel({ children }) {
  const { launchReady, nextRequiredCategory, remainingTaskCount, launchModel, requestArtifactPrompt, flashArtifact } = useMonetization();
  const navigate = useNavigate();
  const basePath = useBasePath();

  const goToNextRequired = () => {
    navigate(basePath || '/');
    requestArtifactPrompt(nextRequiredCategory);
    flashArtifact(nextRequiredCategory);
    setTimeout(() => {
      document.getElementById(`artifact-${nextRequiredCategory}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  return (
    <div className="h-full min-h-0 flex flex-col border border-border rounded-lg bg-surface">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-label-large-emphasized text-default">Custom Monetization Model</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">{children}</div>

      <div className="px-4 py-3 border-t border-border shrink-0 space-y-1.5">
        <Button className="w-full" disabled={!launchReady} onClick={launchModel}>
          Launch monetization model
        </Button>
        {!launchReady && nextRequiredCategory && (
          <button
            type="button"
            onClick={goToNextRequired}
            className="w-full flex items-center justify-center gap-1 text-label-small text-subdued hover:text-default cursor-pointer"
          >
            Finish {CATEGORY_LABELS[nextRequiredCategory]} to continue
            <span className="text-label-small-emphasized">
              &middot; {remainingTaskCount} task{remainingTaskCount === 1 ? '' : 's'} left
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
