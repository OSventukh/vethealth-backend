import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { Module, HttpException, HttpStatus } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileEntity } from './entities/file.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import slugify from 'slugify';
import { directories } from './constants/directory.constant';
import { Fields } from './constants/fields.enum';
import { FileStorageFactory } from './storage/file-storage.factory';
import { LocalFileStorageService } from './storage/local-file-storage.service';
import { S3CompatibleFileStorageService } from './storage/s3-compatible-file-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        return {
          fileFilter: (_request, file, callback) => {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
              return callback(
                new HttpException(
                  {
                    status: HttpStatus.UNPROCESSABLE_ENTITY,
                    errors: {
                      file: `cantUploadFileType`,
                    },
                  },
                  HttpStatus.UNPROCESSABLE_ENTITY,
                ),
                false,
              );
            }

            callback(null, true);
          },
          storage: diskStorage({
            destination: async (_req, file, cb) => {
              const dir = directories[file.fieldname];
              try {
                await fs.mkdir(dir, {
                  recursive: true,
                });
                const filePath = path.join(dir);
                cb(null, filePath);
              } catch (error) {
                cb(error, null);
              }
            },
            filename: (_req, file, cb) => {
              let fileName: string;
              if (file.fieldname === Fields.Topic) {
                fileName = slugify(file.originalname, { lower: true });
              } else {
                fileName = `${file.fieldname}-${Date.now()}-${Math.round(
                  Math.random() * 1e9,
                )}${path.extname(file.originalname)}`;
              }

              cb(null, fileName);
            },
          }),
          limits: {
            fileSize: configService.get('file.maxFileSize', { infer: true }),
          },
        };
      },
    }),
  ],
  controllers: [FilesController],
  providers: [
    FilesService,
    FileStorageFactory,
    LocalFileStorageService,
    S3CompatibleFileStorageService,
  ],
})
export class FilesModule {}
