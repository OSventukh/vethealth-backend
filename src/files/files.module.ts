import * as path from 'path';
import * as fs from 'fs/promises';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        return {
          fileFilter: (request, file, callback) => {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
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
            destination: async (req, file, cb) => {
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
            filename: (req, file, cb) => {
              let fileName: string;
              if (file.fieldname === 'topic-image') {
                fileName = slugify(
                  req.body.title + path.extname(file.originalname),
                  { lower: true },
                );
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
  providers: [FilesService],
})
export class FilesModule {}
