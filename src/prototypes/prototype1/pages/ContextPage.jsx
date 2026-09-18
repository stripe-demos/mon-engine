import IntroScreen from '../monetization/components/IntroScreen';
import MonetizationShell from '../monetization/components/MonetizationShell';
import ArtifactsPanel from '../monetization/components/ArtifactsPanel';
import { useMonetization } from '../monetization/MonetizationContext';

export default function ContextPage() {
  const { source, startContextAnalysis, requestArtifactPrompt } = useMonetization();

  if (!source) {
    return <IntroScreen onSubmit={startContextAnalysis} />;
  }

  return (
    <MonetizationShell>
      <ArtifactsPanel onPromptCategory={requestArtifactPrompt} />
    </MonetizationShell>
  );
}
