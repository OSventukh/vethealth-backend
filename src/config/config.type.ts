import { StringValue } from "ms";

export enum FileStorageDriver {
  Local = 'local',
  S3 = 's3',
  R2 = 'r2',
  Seaweed = 'seaweed',
}

export type AppConfig = {
  nodeEnv: string;
  name: string;
  workingDirectory: string;
  frontendDomain?: string;
  backendDomain: string;
  port: number;
  apiPrefix: string;
  fallbackLanguage: string;
  headerLanguage: string;
};

export type DatabaseConfig = {
  url?: string;
  type?: string;
  host?: string;
  port?: number;
  password?: string;
  name?: string;
  username?: string;
  synchronize?: boolean;
  maxConnections: number;
  sslEnabled?: boolean;
  rejectUnauthorized?: boolean;
  ca?: string;
  key?: string;
  cert?: string;
};

export type FileConfig = {
  storageDriver: FileStorageDriver;
  maxFileSize: number;
  s3Endpoint?: string;
  s3PublicUrl?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3ForcePathStyle: boolean;
  cdnBaseUrl?: string;
  cdnIncludeBucketInPath: boolean;
};

export type AuthConfig = {
  secret: string;
  expires: StringValue;
  refreshSecret: string;
  refreshExpires: StringValue;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
};

export type MailConfig = {
  port: number;
  host?: string;
  user?: string;
  password?: string;
  defaultEmail?: string;
  defaultName?: string;
  ignoreTLS: boolean;
  secure: boolean;
  requireTLS: boolean;
  rejectUnauthorized: boolean;
};

export type AllConfigType = {
  app: AppConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  file: FileConfig;
  mail: MailConfig;
};
