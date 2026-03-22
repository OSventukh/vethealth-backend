export type FileStoragePresignedInput = {
  key: string;
  contentType?: string;
  contentLength?: number;
};

export type FileStoragePresignedResult = {
  uploadSignedUrl: string;
};
