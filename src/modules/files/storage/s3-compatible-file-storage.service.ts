import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  FileStoragePresignedInput,
  FileStoragePresignedResult,
  FileStorage,
  FileStorageUploadInput,
  FileStorageUploadResult,
} from './file-storage.interface';

@Injectable()
export class S3CompatibleFileStorageService implements FileStorage {
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow('file.s3Region', { infer: true }),
      endpoint: this.configService.getOrThrow('file.s3Endpoint', {
        infer: true,
      }),
      forcePathStyle: this.configService.get('file.s3ForcePathStyle', {
        infer: true,
      }),
      credentials: {
        accessKeyId: this.configService.getOrThrow('file.s3AccessKey', {
          infer: true,
        }),
        secretAccessKey: this.configService.getOrThrow('file.s3SecretKey', {
          infer: true,
        }),
      },
    });
  }

  async upload(input: FileStorageUploadInput): Promise<FileStorageUploadResult> {
    const bucket = this.configService.getOrThrow('file.s3Bucket', {
      infer: true,
    });

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return {
      key: input.key,
    };
  }

  async createPresignedUpload(
    input: FileStoragePresignedInput,
  ): Promise<FileStoragePresignedResult> {
    const bucket = this.configService.getOrThrow('file.s3Bucket', {
      infer: true,
    });
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
    });
    const uploadSignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    return {
      uploadSignedUrl,
    };
  }

  async delete(key: string): Promise<void> {
    const bucket = this.configService.getOrThrow('file.s3Bucket', {
      infer: true,
    });

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  getPublicUrl(key: string): string {
    const publicUrl =
      this.configService.get('file.cdnBaseUrl', { infer: true }) ||
      this.configService.getOrThrow('file.s3PublicUrl', { infer: true });
    const includeBucket = this.configService.get('file.cdnIncludeBucketInPath', {
      infer: true,
    });
    const bucket = this.configService.get('file.s3Bucket', { infer: true });
    const normalizedKey = key.replace(/^\/+/, '');

    if (includeBucket && bucket) {
      return `${publicUrl.replace(/\/$/, '')}/${bucket}/${normalizedKey}`;
    }

    return `${publicUrl.replace(/\/$/, '')}/${normalizedKey}`;
  }
}
