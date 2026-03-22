import { registerAs } from '@nestjs/config';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { FileConfig, FileStorageDriver } from './config.type';
import validateConfig from '@/utils/validate-config';

class EnvironmentVariablesValidator {
  @IsEnum(FileStorageDriver)
  @IsOptional()
  FILE_STORAGE_DRIVER: FileStorageDriver;

  @ValidateIf((envValues: EnvironmentVariablesValidator) =>
    [FileStorageDriver.S3, FileStorageDriver.R2, FileStorageDriver.Seaweed].includes(
      envValues.FILE_STORAGE_DRIVER,
    ),
  )
  @IsString()
  FILE_S3_ENDPOINT: string;

  @ValidateIf((envValues: EnvironmentVariablesValidator) =>
    [FileStorageDriver.S3, FileStorageDriver.R2, FileStorageDriver.Seaweed].includes(
      envValues.FILE_STORAGE_DRIVER,
    ),
  )
  @IsString()
  FILE_S3_ACCESS_KEY: string;

  @ValidateIf((envValues: EnvironmentVariablesValidator) =>
    [FileStorageDriver.S3, FileStorageDriver.R2, FileStorageDriver.Seaweed].includes(
      envValues.FILE_STORAGE_DRIVER,
    ),
  )
  @IsString()
  FILE_S3_SECRET_KEY: string;

  @ValidateIf((envValues: EnvironmentVariablesValidator) =>
    [FileStorageDriver.S3, FileStorageDriver.R2, FileStorageDriver.Seaweed].includes(
      envValues.FILE_STORAGE_DRIVER,
    ),
  )
  @IsString()
  FILE_S3_BUCKET: string;

  @ValidateIf((envValues: EnvironmentVariablesValidator) =>
    [FileStorageDriver.S3, FileStorageDriver.R2, FileStorageDriver.Seaweed].includes(
      envValues.FILE_STORAGE_DRIVER,
    ),
  )
  @IsString()
  FILE_S3_REGION: string;

  @IsOptional()
  @IsString()
  FILE_S3_PUBLIC_URL: string;

  @IsOptional()
  @IsString()
  FILE_CDN_BASE_URL: string;

  @IsOptional()
  @IsBoolean()
  FILE_S3_FORCE_PATH_STYLE: boolean;

  @IsOptional()
  @IsBoolean()
  FILE_CDN_INCLUDE_BUCKET_IN_PATH: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  FILE_MAX_SIZE: number;
}

export default registerAs<FileConfig>('file', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  const storageDriver =
    (process.env.FILE_STORAGE_DRIVER as FileStorageDriver | undefined) ??
    FileStorageDriver.Local;
  const s3PublicUrl = process.env.FILE_S3_PUBLIC_URL;
  const cdnBaseUrl = process.env.FILE_CDN_BASE_URL;

  if (
    [FileStorageDriver.S3, FileStorageDriver.R2, FileStorageDriver.Seaweed].includes(
      storageDriver,
    ) &&
    !s3PublicUrl &&
    !cdnBaseUrl
  ) {
    throw new Error(
      'FILE_S3_PUBLIC_URL or FILE_CDN_BASE_URL is required for non-local file storage.',
    );
  }

  if (
    storageDriver === FileStorageDriver.R2 &&
    s3PublicUrl?.includes('r2.cloudflarestorage.com')
  ) {
    throw new Error(
      'FILE_S3_PUBLIC_URL must point to a public R2 URL (r2.dev or a custom domain), not the S3 API endpoint.',
    );
  }

  return {
    storageDriver,
    maxFileSize: process.env.FILE_MAX_SIZE
      ? parseInt(process.env.FILE_MAX_SIZE, 10)
      : 5242880, // 5mb
    s3Endpoint: process.env.FILE_S3_ENDPOINT,
    s3PublicUrl,
    s3AccessKey: process.env.FILE_S3_ACCESS_KEY,
    s3SecretKey: process.env.FILE_S3_SECRET_KEY,
    s3Bucket: process.env.FILE_S3_BUCKET,
    s3Region: process.env.FILE_S3_REGION,
    s3ForcePathStyle: process.env.FILE_S3_FORCE_PATH_STYLE === 'true',
    cdnBaseUrl,
    cdnIncludeBucketInPath:
      process.env.FILE_CDN_INCLUDE_BUCKET_IN_PATH === 'true',
  };
});
