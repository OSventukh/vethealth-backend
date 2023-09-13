import * as path from 'path';
import * as fs from 'fs';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        return {
          fileFilter: (request, file, callback) => {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
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
            destination: (req, file, cb) => {
              const uploadFolder = path.join(process.cwd(), 'uploads');
              const imagesFolder = path.join(uploadFolder, 'images');
              // create uploads/images folders if not exist
              fs.mkdirSync(imagesFolder, { recursive: true });
              let filePath: string;
              switch (file.fieldname) {
                case 'topic-image':
                  const topicImages = path.join(imagesFolder, 'topics');
                  // create folder upload/images/topics if not exist
                  fs.mkdirSync(topicImages, { recursive: true });
                  filePath = topicImages;
                  break;
                case 'post-image':
                  const postImages = path.join(imagesFolder, 'posts');
                  // create folder upload/images/posts if not exist
                  fs.mkdirSync(postImages, { recursive: true });
                  const dateFolder = path.join(
                    postImages,
                    new Date().toISOString().slice(0, 10),
                  );
                  // create folder upload/images/[yyyy-mm-dd] if not exist
                  fs.mkdirSync(dateFolder, { recursive: true });
                  filePath = dateFolder;

                default:
                  filePath = imagesFolder;
                  break;
              }

              cb(null, filePath);
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
