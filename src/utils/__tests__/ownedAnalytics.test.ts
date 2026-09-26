import { trackOwnedEvent } from '../ownedAnalytics';

type TestWindow = Window & {
  ownedPortfolioTrack?: jest.Mock;
  ownedPortfolioQueue?: Array<[string, Record<string, string | number | boolean>]>;
};

describe('owned analytics', () => {
  const analyticsWindow = window as TestWindow;

  afterEach(() => {
    delete analyticsWindow.ownedPortfolioTrack;
    delete analyticsWindow.ownedPortfolioQueue;
  });

  it('dispatches canonical events when the tracker is ready', () => {
    analyticsWindow.ownedPortfolioTrack = jest.fn(() => true);

    expect(trackOwnedEvent('signup_completed', { flow: 'family_onboarding' })).toBe(true);
    expect(analyticsWindow.ownedPortfolioTrack).toHaveBeenCalledWith(
      'signup_completed',
      { flow: 'family_onboarding' },
    );
  });

  it('queues events emitted before the tracker loads', () => {
    expect(trackOwnedEvent('download_completed', {
      asset_type: 'budget_report',
      format: 'pdf',
    })).toBe(true);

    expect(analyticsWindow.ownedPortfolioQueue).toEqual([
      ['download_completed', { asset_type: 'budget_report', format: 'pdf' }],
    ]);
  });
});
