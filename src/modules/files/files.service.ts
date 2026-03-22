import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { Repository } from 'typeorm';
import { Fields } from './constants/fields.enum';
import { ConfigService } from '@nestjs/config';
import { AllConfigType, FileStorageDriver } from '@/config/config.type';
import { FileStorageFactory } from './storage/file-storage.factory';
import * as fs from 'fs/promises';
import * as path from 'path';
import slugify from 'slugify';
import { UploadPresignedDto } from './dto/upload-presigned.dto';

type FileResponse = {
  id: string;
  host?: string;
  path: string;
  relativePath: string;
};
type ImageResponse =
  | {
      [key in Fields]: FileResponse;
    }
  | object;

type PresignedUploadResponse = {
  file: FileResponse;
  uploadSignedUrl: string;
};

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileStorageFactory: FileStorageFactory,
  ) {}

  async uploadFile(files: {
    [key in Fields]: Express.Multer.File[];
  }): Promise<ImageResponse> {
    if (!files) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'selectFile',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const imageResponse: ImageResponse = {};
    const storageDriver = this.configService.getOrThrow('file.storageDriver', {
      infer: true,
    });
    const storage = this.fileStorageFactory.getStorage();

    for (const key in files) {
      const uploadedFile = files[key][0];
      this.assertFileType(uploadedFile.originalname);
      let filePath = `/${uploadedFile.path.replace(/\\/g, '/')}`;

      if (storageDriver !== FileStorageDriver.Local) {
        const normalizedFilePath = uploadedFile.path.replace(/\\/g, '/');
        const storageKey = normalizedFilePath
          .replace(/^\/+/, '')
          .replace(/^uploads\//, '');
        const fileBuffer = await fs.readFile(uploadedFile.path);
        await storage.upload({
          key: storageKey,
          body: fileBuffer,
          contentType: uploadedFile.mimetype,
        });
        filePath = storageKey;

        // Avoid accumulating local temp files when object storage is enabled.
        await fs.unlink(uploadedFile.path).catch(() => undefined);
      }

      const fileRepository = await this.fileRepository.save(
        this.fileRepository.create({
          path: filePath,
        }),
      );

      imageResponse[key] = fileRepository;
    }
    return imageResponse;
  }

  async createPresignedUpload(
    input: UploadPresignedDto,
  ): Promise<PresignedUploadResponse> {
    if (!input) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'selectFile',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    this.assertFileType(input.fileName);

    const maxFileSize = this.configService.get('file.maxFileSize', {
      infer: true,
    }) || 0;

    if (input.fileSize > maxFileSize) {
      throw new HttpException(
        {
          status: HttpStatus.PAYLOAD_TOO_LARGE,
          errors: {
            file: 'fileTooLarge',
          },
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    const storageDriver = this.configService.getOrThrow('file.storageDriver', {
      infer: true,
    });

    if (storageDriver === FileStorageDriver.Local) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'presignedUploadNotAvailable',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const storageKey = this.createStorageKey(input.field, input.fileName);
    const storage = this.fileStorageFactory.getStorage();
    const presigned = await storage.createPresignedUpload({
      key: storageKey,
      contentType: input.contentType,
      contentLength: input.fileSize,
    });

    const fileRepository = await this.fileRepository.save(
      this.fileRepository.create({
        path: storageKey,
      }),
    );

    return {
      file: fileRepository,
      uploadSignedUrl: presigned.uploadSignedUrl,
    };
  }

  private assertFileType(fileName: string): void {
    if (!fileName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'cantUploadFileType',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private createStorageKey(field: Fields, fileName: string): string {
    const extension = path.extname(fileName).toLowerCase();
    const fileNameWithoutExtension = path.basename(fileName, extension);
    const randomSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    if (field === Fields.Topic) {
      const topicFileName = slugify(fileNameWithoutExtension, {
        lower: true,
        strict: true,
      });
      return `images/topics/${topicFileName}${extension}`;
    }

    if (field === Fields.PostFeatured) {
      return `images/posts/featured/${field}-${randomSuffix}${extension}`;
    }

    return `images/posts/content/${new Date().toISOString().slice(0, 10)}/${field}-${randomSuffix}${extension}`;
  }
}
