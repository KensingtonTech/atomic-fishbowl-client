export class Content {
  id: string;
  session: number;
  contentType?: string;
  contentSubType?: string;
  contentFile?: string;
  proxyContentFile?: string;
  thumbnail?: string;
  pdfImage?: string;
  archiveFilename?: string;
  hashType?: string;
  hashValue?: string;
  hashFriendly?: string;
  fromArchive?: boolean;
  isArchive?: boolean;
  archiveType: string;
  textDistillationEnabled?: boolean;
  regexDistillationEnabled?: boolean;
  textTermsMatched?: string[];
  regexTermsMatched?: string[];
}
