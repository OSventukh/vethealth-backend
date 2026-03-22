import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType, FileStorageDriver } from '@/config/config.type';
import { FileStorage } from './file-storage.interface';
import { LocalFileStorageService } from './local-file-storage.service';
import { S3CompatibleFileStorageService } from './s3-compatible-file-storage.service';

@Injectable()
export class FileStorageFactory {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly localStorage: LocalFileStorageService,
    private readonly s3CompatibleStorage: S3CompatibleFileStorageService,
  ) {}

  getStorage(): FileStorage {
    const driver = this.configService.getOrThrow('file.storageDriver', {
      infer: true,
    });

    if (driver === FileStorageDriver.Local) {
      return this.localStorage;
    }

    return this.s3CompatibleStorage;
  }
}
