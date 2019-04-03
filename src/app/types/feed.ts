import { CollectionMeta } from './collection-meta';

export interface FeedSchedule {
  type: string; // hours, minutes, day
  value: number; // string | number
}

export interface Feed {
  id: string;
  name: string;
  type: string; // 'manual' or 'scheduled'
  creator?: CollectionMeta;
  modifier?: CollectionMeta;
  version?: number;

  delimiter: string;
  headerRow: boolean; // treat first CSV row as a header or not

  valueColumn: number;
  typeColumn: number;
  friendlyNameColumn: number;

  // manual feeds
  filename?: string;
  internalFilename?: string;

  // scheduled feeds
  url?: string;
  authentication?: boolean;
  username?: string;
  password?: string;
  schedule?: FeedSchedule;

  authChanged?: boolean; // indicates whether user / password changed when editing a scheduled feed
}
