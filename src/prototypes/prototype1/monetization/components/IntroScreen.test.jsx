import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IntroScreen from './IntroScreen';
import { MIN_DESCRIPTION_LENGTH, EXAMPLE_BUSINESS_DESCRIPTION } from '../constants';

describe('IntroScreen', () => {
  it('disables Continue until a valid description is entered', async () => {
    render(<IntroScreen onSubmit={() => {}} />);
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    expect(continueButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Describe your business'), 'Too short');
    expect(continueButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Describe your business'), ' '.repeat(1) + 'x'.repeat(MIN_DESCRIPTION_LENGTH));
    expect(continueButton).toBeEnabled();
  });

  it('fills in the exact example description when "Use example" is clicked', async () => {
    render(<IntroScreen onSubmit={() => {}} />);
    await userEvent.click(screen.getByText('Use example'));
    expect(screen.getByLabelText('Describe your business')).toHaveValue(EXAMPLE_BUSINESS_DESCRIPTION);
  });

  it('submits a description source with the full raw text on Continue, after the fake upload sequence', async () => {
    const onSubmit = vi.fn();
    render(<IntroScreen onSubmit={onSubmit} />);
    await userEvent.click(screen.getByText('Use example'));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText(/Building your monetization engine/, {}, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(
      () =>
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'description', rawText: EXAMPLE_BUSINESS_DESCRIPTION, extractionStatus: 'complete' })
        ),
      { timeout: 5000 }
    );
  });

  it('shows a validation error for an invalid URL after the field is touched', async () => {
    render(<IntroScreen onSubmit={() => {}} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Website URL' }));
    const urlInput = screen.getByLabelText('Website URL');
    await userEvent.type(urlInput, 'not a url');
    await userEvent.tab();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid URL');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('surfaces the demo-limitation message for an unrecognized, but valid, URL instead of fabricating results', async () => {
    const onSubmit = vi.fn();
    render(<IntroScreen onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Website URL' }));
    await userEvent.type(screen.getByLabelText('Website URL'), 'unknown-business.example');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/live retrieval|not connected|demo/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not enable Continue in document mode until a file has been successfully extracted', async () => {
    render(<IntroScreen onSubmit={() => {}} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Upload a document' }));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
