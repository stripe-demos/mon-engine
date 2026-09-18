import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBasePath } from '../../../../contexts/BasePath';
import { STAGES, STAGE_LABELS } from '../constants';
import { useMonetization } from '../MonetizationContext';

const STAGE_PATH = { context: '', test_and_iterate: 'test-and-iterate', update_your_code: 'update-your-code' };

export default function StageNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useBasePath();
  const { config, dirtyStages, markStageViewed } = useMonetization();

  const isActive = (stage) => {
    const path = STAGE_PATH[stage];
    return path ? location.pathname.endsWith(`/${path}`) : location.pathname === basePath || location.pathname === `${basePath}/`;
  };

  const isDisabled = (stage) => stage !== 'context' && !config;
  const activeStage = STAGES.find(isActive) ?? 'context';

  useEffect(() => {
    markStageViewed(activeStage);
  }, [activeStage, markStageViewed]);

  return (
    <nav aria-label="Onboarding stages" className="flex gap-1 p-1 rounded-lg bg-offset mb-4 max-w-[640px]">
      {STAGES.map((stage) => {
        const active = isActive(stage);
        const disabled = isDisabled(stage);
        const dirty = !active && dirtyStages[stage];
        return (
          <button
            key={stage}
            type="button"
            disabled={disabled}
            onClick={() => navigate(`${basePath}/${STAGE_PATH[stage]}`)}
            aria-current={active ? 'true' : undefined}
            className={`relative flex-1 whitespace-nowrap rounded-md text-label-medium-emphasized transition-[background-color,color,padding] ${
              active ? 'bg-surface text-default shadow-sm px-6 py-2' : disabled ? 'text-subdued/50 cursor-not-allowed px-4 py-2' : 'text-subdued hover:text-default cursor-pointer px-4 py-2'
            }`}
          >
            {STAGE_LABELS[stage]}
            {dirty && (
              <span
                className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-brand"
                aria-label={`${STAGE_LABELS[stage]} has updates`}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
