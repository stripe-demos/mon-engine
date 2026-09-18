import StageNav from './StageNav';
import ChatPanel from './ChatPanel';
import CustomModelPanel from './CustomModelPanel';

// Persistent shell for all three onboarding stages (Context, Test and
// iterate, Update your code) — the stage selector and chat stay put while
// only the right-hand Custom Monetization Model panel content swaps.
export default function MonetizationShell({ children }) {
  return (
    <div>
      <div className="grid gap-6 items-center" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <h1 className="text-heading-medium text-default">Stripe Monetization Engine</h1>
        <div className="flex justify-center">
          <StageNav />
        </div>
      </div>

      <div className="grid gap-6 min-h-0" style={{ gridTemplateColumns: '1fr 2fr', height: 'calc(100vh - 160px)', minHeight: 480 }}>
        <div className="dark border border-border rounded-lg px-3 py-3 h-full min-h-0 bg-surface overflow-hidden">
          <ChatPanel />
        </div>
        <div className="force-light h-full min-h-0 overflow-hidden">
          <CustomModelPanel>{children}</CustomModelPanel>
        </div>
      </div>
    </div>
  );
}
