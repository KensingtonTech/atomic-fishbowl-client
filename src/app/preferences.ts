export interface Preferences {
  minX: number;
  minY: number;
  defaultContentLimit: number;
  defaultRollingHours: number;
  debugLogging: boolean;
  serviceTypes: { nw: boolean, sa: boolean };
  nw: NwPreferences;
  sa: SaPreferences;
}

interface NwPreferences {
  url: string;
  defaultQuerySelection: string;
  presetQuery: string;
  queryTimeout: number;
  contentTimeout: number;
  // summaryTimeout: number;
  queryDelayMinutes: number;
  maxContentErrors: number;
  displayedKeys: string[];
  masonryKeys: MasonryKey[];
}

interface SaPreferences {
  url: string;
  presetQuery: string;
  defaultQuerySelection: string;
  contentTimeout: number;
  queryTimeout: number;
  queryDelayMinutes: number;
  maxContentErrors: number;
  displayedKeys: string[];
  masonryKeys: MasonryKey[];
}

interface MasonryKey {
  key: string;
  friendly: string;
}
