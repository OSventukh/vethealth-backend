import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  AfterInsert,
  AfterLoad,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import appConfig from '@/config/app.config';
import fileConfig from '@/config/file.config';
import { AppConfig, FileConfig, FileStorageDriver } from '@/config/config.type';
import { Expose } from 'class-transformer';

@Entity({ name: 'files' })
export class FileEntity {
  @ApiProperty({ example: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Allow()
  @Column()
  path: string;

  @Expose()
  relativePath: string;
  
  @AfterInsert()
  @AfterLoad()
  updatePath() {
    if (this.path.startsWith('http://') || this.path.startsWith('https://')) {
      this.relativePath = this.path;
      return;
    }

    if (this.path.indexOf('/') === 0) {
      this.path = (appConfig() as AppConfig).backendDomain + this.path;
      this.relativePath = this.path;
      return;
    }

    const storageConfig = fileConfig() as FileConfig;
    if (storageConfig.storageDriver !== FileStorageDriver.Local) {
      const publicUrl =
        storageConfig.cdnBaseUrl ||
        storageConfig.s3PublicUrl ||
        '';
      const normalizedPath = this.path.replace(/^\/+/, '');
      const useBucketInPath = storageConfig.cdnIncludeBucketInPath;
      const bucket = storageConfig.s3Bucket;

      this.relativePath = normalizedPath;
      this.path = useBucketInPath && bucket
        ? `${publicUrl.replace(/\/$/, '')}/${bucket}/${normalizedPath}`
        : `${publicUrl.replace(/\/$/, '')}/${normalizedPath}`;
    }
  }
}