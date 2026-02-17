import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SummaryStep from '../SummaryStep';
import { useWizard } from '../../WizardContext';

jest.mock('../../WizardContext', () => ({
  useWizard: jest.fn(),
}));

const mockUseWizard = useWizard as jest.MockedFunction<typeof useWizard>;

const buildWizardState = () => ({
  step: 'summary',
  activityId: null,
  activityType: 'gym',
  duration: 45,
  intensityLevel: 'moderate',
  workoutName: 'Upper Body Session',
  exercises: [],
  additionalActivities: [],
  notes: '',
  imageUrls: [],
  activityDate: new Date('2026-02-17T10:00:00.000Z'),
  personId: 'person-1',
});

describe('SummaryStep save handling', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows an error when save returns null', async () => {
    const saveActivity = jest.fn().mockResolvedValue(null);
    const onClose = jest.fn();

    mockUseWizard.mockReturnValue({
      state: buildWizardState() as any,
      saveActivity: saveActivity as any,
      goToStep: jest.fn(),
      isLoading: false,
    } as any);

    render(<SummaryStep onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /save workout/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to save workout. Please try again.')).toBeInTheDocument();
    });

    expect(saveActivity).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows API error messages from save failures', async () => {
    const saveActivity = jest.fn().mockRejectedValue(new Error('Person not found in family'));

    mockUseWizard.mockReturnValue({
      state: buildWizardState() as any,
      saveActivity: saveActivity as any,
      goToStep: jest.fn(),
      isLoading: false,
    } as any);

    render(<SummaryStep onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /save workout/i }));

    await waitFor(() => {
      expect(screen.getByText('Person not found in family')).toBeInTheDocument();
    });
  });
});
