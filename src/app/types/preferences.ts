export interface Preferences {
  minX: number;
  minY: number;
  defaultContentLimit: number;
  defaultRollingHours: number;
  debugLogging: boolean;
  serviceTypes: { nw: boolean; sa: boolean };
  nw: NwPreferences;
  sa: SaPreferences;
  tokenExpirationHours: number;
}

interface NwPreferences {
  url: string;
  defaultQuerySelection: string;
  presetQuery: string;
  queryTimeout: number;
  contentTimeout: number;
  queryDelayMinutes: number;
  maxContentErrors: number;
  displayedKeys: string[];
  masonryKeys: MasonryKey[];
  sessionLimit: number;
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
  sessionLimit: number;
}

export interface MasonryKey {
  key: string;
  friendly: string;
}
