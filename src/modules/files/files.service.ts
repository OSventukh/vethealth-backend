import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { Repository } from 'typeorm';
import { Fields } from './constants/fields.enum';
import { ConfigService } from '@nestjs/config';
import { AllConfigType, FileStorageDriver } from '@/config/config.type';
import { FileStorageFactory } from './storage/file-storage.factory';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import slugify from 'slugify';
import { UploadPresignedDto } from './dto/upload-presigned.dto';
import { sniffImageType } from './utils/sniff-image-type';

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

      // Клієнт заявляє mimetype за розширенням, тому AVIF, названий .jpeg,
      // приїжджає як image/jpeg. Віддати таке з R2 = Firefox його заблокує
      // (OpaqueResponseBlocking). Тому реальний тип беремо з байтів і, якщо
      // розширення бреше, виправляємо і його — щоб і local-драйвер (де
      // Content-Type виводиться з розширення) віддавав файл коректно.
      // Не фатально, якщо файл не прочитався: тоді просто лишаємо заявлений
      // клієнтом тип (нижче, для об'єктних сховищ, читання повториться вже
      // без catch — там байти обов'язкові).
      const sniffBuffer = await fs
        .readFile(uploadedFile.path)
        .catch(() => null);
      const sniffed = sniffBuffer ? sniffImageType(sniffBuffer) : null;
      const actualPath = await this.reconcileExtension(uploadedFile, sniffed);
      const contentType = sniffed?.mimeType ?? uploadedFile.mimetype;

      let filePath = `/${actualPath.replace(/\\/g, '/')}`;

      if (storageDriver !== FileStorageDriver.Local) {
        const normalizedFilePath = actualPath.replace(/\\/g, '/');
        const storageKey = normalizedFilePath
          .replace(/^\/+/, '')
          .replace(/^uploads\//, '');
        await storage.upload({
          key: storageKey,
          body: sniffBuffer ?? (await fs.readFile(actualPath)),
          contentType,
        });
        filePath = storageKey;

        // Avoid accumulating local temp files when object storage is enabled.
        await fs.unlink(actualPath).catch(() => undefined);
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

    const maxFileSize =
      this.configService.get('file.maxFileSize', {
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

  /**
   * Якщо розширення не відповідає реальному вмісту (AVIF з іменем .jpeg тощо),
   * перейменовує тимчасовий файл на диску під справжнє розширення і повертає
   * новий шлях. Інакше повертає шлях без змін.
   */
  private async reconcileExtension(
    uploadedFile: Express.Multer.File,
    sniffed: { extension: string } | null,
  ): Promise<string> {
    if (!sniffed) {
      return uploadedFile.path;
    }

    const currentExtension = path.extname(uploadedFile.path).toLowerCase();
    const jpegAliases = new Set(['.jpg', '.jpeg']);
    const matches =
      currentExtension === sniffed.extension ||
      (jpegAliases.has(currentExtension) && jpegAliases.has(sniffed.extension));

    if (matches) {
      return uploadedFile.path;
    }

    const correctedPath =
      uploadedFile.path.slice(
        0,
        uploadedFile.path.length - currentExtension.length,
      ) + sniffed.extension;

    await fs.rename(uploadedFile.path, correctedPath);
    return correctedPath;
  }

  private assertFileType(fileName: string): void {
    if (!fileName.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i)) {
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
