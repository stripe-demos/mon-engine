import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Button } from '../../../../sail';
import { Icon } from '../../../../icons/SailIcons';
import { useBasePath } from '../../../../contexts/BasePath';
import { useMonetization } from '../MonetizationContext';

// Persistent across the whole onboarding flow — lets a demo presenter wipe
// all progress and jump back to the starting screen without a full page reload.
export default function ResetDemoControl() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { resetDemo } = useMonetization();
  const navigate = useNavigate();
  const basePath = useBasePath();

  const handleConfirm = () => {
    resetDemo();
    setConfirmOpen(false);
    navigate(basePath || '/');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="fixed top-4 right-4 z-50 flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-label-small-emphasized text-subdued hover:text-default hover:bg-offset cursor-pointer shadow-sm"
      >
        <Icon name="refresh" size="xsmall" className="text-icon-subdued" />
        Reset demo
      </button>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reset the demo?"
        size="small"
        overlayClassName="z-[101]"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirm}>Yes, reset</Button>
          </div>
        }
      >
        <p className="text-body-medium text-subdued">
          This clears all business context, pricing configuration, and chat history, and takes you back to the
          starting screen. This can't be undone.
        </p>
      </Dialog>
    </>
  );
}
