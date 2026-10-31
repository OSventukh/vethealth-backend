export type FileStorageUploadInput = {
  key: string;
  body: Buffer;
  contentType?: string;
};

export type FileStorageUploadResult = {
  key: string;
};

export type FileStoragePresignedInput = {
  key: string;
  contentType?: string;
  contentLength?: number;
};

export type FileStoragePresignedResult = {
  uploadSignedUrl: string;
};

export interface FileStorage {
  upload(input: FileStorageUploadInput): Promise<FileStorageUploadResult>;
  createPresignedUpload(
    input: FileStoragePresignedInput,
  ): Promise<FileStoragePresignedResult>;
  /** Байти обʼєкта (для AI-аналізу зображення). */
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
