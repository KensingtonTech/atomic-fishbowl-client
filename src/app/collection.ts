import { CollectionMeta } from './collection-meta';

export interface Collection {
  id: string;
  name: string;
  type: string;
  state: string;
  nwserver:  string;
  nwserverName: string;
  query?: string;
  contentTypes?: string[];
  contentLimit: number;
  deviceNumber?: number;
  bound: boolean;
  usecase: string;
  minX?: number;
  minY?: number;
  distillationEnabled?: boolean;
  distillationTerms?: string[];
  regexDistillationEnabled?: boolean;
  regexDistillationTerms?: string[];
  useHashFeed?: boolean; // whether to use a hash feed
  hashFeed?: string; // the uuid of the feed
  sha1Enabled?: boolean;
  sha1Hashes?: string[];
  sha256Enabled?: boolean;
  sha256Hashes?: string[];
  md5Enabled?: boolean;
  md5Hashes?: string[];
  lastHours?: number;
  timeBegin?: number;
  timeEnd?: number;
  creator?: CollectionMeta;
  modifier?: CollectionMeta;
  executeTime: number;
}
