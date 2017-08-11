export class Image {
  session: number;
  contentType?: string; // image, pdf, hash
  contentFile?: string;
  // image?: string; // image file URL
  thumbnail?: string; // thumbnail file URL
  pdfImage?: string;
  archiveFilename?: string;
  hashType?: string;
  hashValue?: string;
  hashFriendly?: string;
  fromArchive?: boolean;
  archiveType: string;
}
