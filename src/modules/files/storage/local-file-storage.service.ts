import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import {
  FileStoragePresignedInput,
  FileStoragePresignedResult,
  FileStorage,
  FileStorageUploadInput,
  FileStorageUploadResult,
} from './file-storage.interface';

@Injectable()
export class LocalFileStorageService implements FileStorage {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  async upload(_: FileStorageUploadInput): Promise<FileStorageUploadResult> {
    throw new Error(
      'Local storage upload is not implemented in this migration step.',
    );
  }

  async createPresignedUpload(
    _: FileStoragePresignedInput,
  ): Promise<FileStoragePresignedResult> {
    throw new Error('Presigned upload is not available for local storage.');
  }

  async delete(_: string): Promise<void> {
    throw new Error(
      'Local storage delete is not implemented in this migration step.',
    );
  }

  getPublicUrl(key: string): string {
    const backendDomain = this.configService.getOrThrow('app.backendDomain', {
      infer: true,
    });
    return `${backendDomain}${key.startsWith('/') ? '' : '/'}${key}`;
  }
}
