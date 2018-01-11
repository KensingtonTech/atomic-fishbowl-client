export interface Collection {
  id: string;
  name: string;
  state: string;
  nwserver:  string;
  nwserverName: string;
  sessionLimit: number;
  query: string;
  contentTypes: string[];
  deviceNumber?: number;
  type: string;
  bound: boolean;
  usecase: string;
  distillationEnabled: boolean;
  distillationTerms?: string[];
  regexDistillationEnabled: boolean;
  regexDistillationTerms?: string[];
  minX: number;
  minY: number;
  imageLimit: number;
  sha1Enabled: boolean;
  sha256Enabled: boolean;
  md5Enabled: boolean;
  lastHours?: number;
  timeBegin?: number;
  timeEnd?: number;
  creator?: CollectionMeta;
  modifier?: CollectionMeta;
}

export interface CollectionMeta {
  username: string;
  id: string;
  fullname: string;
  timestamp: number;
}
