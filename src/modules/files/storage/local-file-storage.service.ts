import * as fs from 'node:fs/promises';
import * as path from 'node:path';
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

const UPLOADS_DIR = 'uploads';

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

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.resolveUploadPath(key));
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(this.resolveUploadPath(key)).catch((error: unknown) => {
      // Файлу вже немає — бажаний стан досягнуто.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    });
  }

  getPublicUrl(key: string): string {
    const backendDomain = this.configService.getOrThrow('app.backendDomain', {
      infer: true,
    });
    return `${backendDomain}${key.startsWith('/') ? '' : '/'}${key}`;
  }

  /**
   * Ключ локального файлу — шлях у БД (`/uploads/images/…`). Дозволяємо лише
   * файли всередині `uploads/`, щоб зіпсований запис не вивів за її межі.
   */
  private resolveUploadPath(key: string): string {
    const root = path.resolve(UPLOADS_DIR);
    const resolved = path.resolve(key.replace(/^\/+/, ''));
    if (!resolved.startsWith(root + path.sep)) {
      throw new Error(`Refusing to touch a file outside uploads: "${key}"`);
    }
    return resolved;
  }
}
