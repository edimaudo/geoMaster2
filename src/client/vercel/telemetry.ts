// Browser-only adapter for the Vercel build.
// Reddit Journeys telemetry is intentionally a no-op outside Devvit.
export const telemetry = {
  appReady: async (): Promise<void> => undefined,
  startJourney: async (): Promise<void> => undefined,
  progress: async (_event: { progress: number; action?: string }): Promise<void> => undefined,
  endJourney: async (_event: { complete: boolean; game?: { win?: boolean; score?: number } }): Promise<void> => undefined,
};
