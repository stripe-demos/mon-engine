import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArtifactCard from './ArtifactCard';

function makeArtifact(overrides = {}) {
  return {
    category: 'business_details',
    title: 'Business details',
    status: 'ready',
    completeness: 100,
    confidence: 90,
    content: { companyName: 'Acme', companyLocation: 'San Francisco, CA', serviceableMarkets: ['United States'] },
    missingInformation: [],
    evidence: [],
    assumptions: [],
    ...overrides,
  };
}

describe('ArtifactCard', () => {
  it('shows separate completeness and confidence percentages, never a combined score', () => {
    render(<ArtifactCard artifact={makeArtifact({ completeness: 100, confidence: 62 })} onPrompt={() => {}} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/62% · Medium confidence/)).toBeInTheDocument();
  });

  it('renders two independent accessible progress bars', () => {
    render(<ArtifactCard artifact={makeArtifact({ completeness: 80, confidence: 40 })} onPrompt={() => {}} />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveAttribute('aria-valuenow', '80');
    expect(bars[1]).toHaveAttribute('aria-valuenow', '40');
  });

  it('shows a waiting state before analysis has run, with no scores', () => {
    render(<ArtifactCard artifact={makeArtifact({ status: 'waiting', completeness: 0, confidence: 0 })} onPrompt={() => {}} />);
    expect(screen.getByText('Waiting for analysis to begin.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('surfaces missing-information warnings when required fields are absent', () => {
    render(
      <ArtifactCard
        artifact={makeArtifact({ status: 'needs_information', completeness: 30, missingInformation: ['product name'] })}
        onPrompt={() => {}}
      />
    );
    expect(screen.getByText(/Needs more information: product name/)).toBeInTheDocument();
  });

  it('calls onPrompt with the artifact category when "Add details" is clicked', async () => {
    const onPrompt = vi.fn();
    render(<ArtifactCard artifact={makeArtifact({ status: 'needs_information' })} onPrompt={onPrompt} />);
    await userEvent.click(screen.getByText('Add details'));
    expect(onPrompt).toHaveBeenCalledWith('business_details');
  });

  it('labels the edit action "Edit result" once the artifact is ready', () => {
    render(<ArtifactCard artifact={makeArtifact({ status: 'ready' })} onPrompt={() => {}} />);
    expect(screen.getByText('Edit result')).toBeInTheDocument();
  });

  it('opens the evidence drawer by clicking the confidence percentage', async () => {
    render(<ArtifactCard artifact={makeArtifact()} onPrompt={() => {}} />);
    await userEvent.click(screen.getByText(/% ·/));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
