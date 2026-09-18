import { useState } from 'react';
import { CONTEXT_CATEGORIES } from '../constants';
import { useMonetization } from '../MonetizationContext';
import ArtifactCard from './ArtifactCard';

export default function ArtifactsPanel({ onPromptCategory }) {
  const { artifacts, activeCategory, flashCategory, flashArtifact } = useMonetization();
  const [expandedCategory, setExpandedCategory] = useState(null);

  return (
    <div className="space-y-3">
      {CONTEXT_CATEGORIES.map((category) => {
        // While the agent is actively building this category, force its card
        // open so field checkboxes fill in live. Every other card keeps
        // responding to manual expand/collapse regardless of what's building.
        const expanded = category === activeCategory ? true : expandedCategory === category;
        return (
          <ArtifactCard
            key={category}
            artifact={artifacts[category]}
            onPrompt={(cat) => {
              flashArtifact(cat);
              onPromptCategory(cat);
            }}
            active={category === activeCategory}
            flash={category === flashCategory}
            expanded={expanded}
            onToggleExpand={() => setExpandedCategory((prev) => (prev === category ? null : category))}
          />
        );
      })}
    </div>
  );
}
