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
import { UploadPresignedDto } from './dto/upload-presigned.dto';
import { sniffImageType } from './utils/sniff-image-type';
import { optimizeImage, ProcessedImage } from './utils/optimize-image';
import { uniqueFileName } from './utils/unique-file-name';

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

  // Multer кладе лише ті поля, що прийшли в запиті — решти ключів немає.
  async uploadFile(
    files: Partial<Record<Fields, Express.Multer.File[]>>,
  ): Promise<ImageResponse> {
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
      // Растр заодно оптимізується (WebP, ≤2400px) і отримує розміри.
      // Не фатально, якщо файл не прочитався: тоді просто лишаємо заявлений
      // клієнтом тип (нижче, для об'єктних сховищ, читання повториться вже
      // без catch — там байти обов'язкові).
      const original = await fs.readFile(uploadedFile.path).catch(() => null);
      const sniffed = original ? sniffImageType(original) : null;
      const image =
        original && sniffed ? await optimizeImage(original, sniffed) : null;
      const actualPath = await this.finalizeFile(uploadedFile, image);
      const contentType = image?.mimeType ?? uploadedFile.mimetype;
      const body = image?.buffer ?? original;

      let filePath = `/${actualPath.replace(/\\/g, '/')}`;

      if (storageDriver !== FileStorageDriver.Local) {
        const normalizedFilePath = actualPath.replace(/\\/g, '/');
        const storageKey = normalizedFilePath
          .replace(/^\/+/, '')
          .replace(/^uploads\//, '');
        await storage.upload({
          key: storageKey,
          body: body ?? (await fs.readFile(actualPath)),
          contentType,
        });
        filePath = storageKey;

        // Avoid accumulating local temp files when object storage is enabled.
        await fs.unlink(actualPath).catch(() => undefined);
      }

      const fileRepository = await this.fileRepository.save(
        this.fileRepository.create({
          path: filePath,
          originalName: uploadedFile.originalname.slice(0, 255),
          mimeType: contentType,
          size: body?.length ?? uploadedFile.size,
          width: image?.width ?? null,
          height: image?.height ?? null,
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
        originalName: input.fileName.slice(0, 255),
        mimeType: input.contentType ?? null,
        size: input.fileSize,
      }),
    );

    return {
      file: fileRepository,
      uploadSignedUrl: presigned.uploadSignedUrl,
    };
  }

  /**
   * Доводить тимчасовий файл на диску до фінального вигляду: перекодовані
   * байти записуються, а розширення виправляється під реальний вміст (AVIF з
   * іменем .jpeg, результат WebP-оптимізації). Повертає фінальний шлях.
   */
  private async finalizeFile(
    uploadedFile: Express.Multer.File,
    image: ProcessedImage | null,
  ): Promise<string> {
    if (!image) {
      return uploadedFile.path;
    }

    const currentExtension = path.extname(uploadedFile.path).toLowerCase();
    const jpegAliases = new Set(['.jpg', '.jpeg']);
    const matches =
      currentExtension === image.extension ||
      (jpegAliases.has(currentExtension) && jpegAliases.has(image.extension));
    const finalPath = matches
      ? uploadedFile.path
      : uploadedFile.path.slice(
          0,
          uploadedFile.path.length - currentExtension.length,
        ) + image.extension;

    if (image.changed) {
      await fs.writeFile(finalPath, image.buffer);
      if (finalPath !== uploadedFile.path) {
        await fs.unlink(uploadedFile.path).catch(() => undefined);
      }
    } else if (finalPath !== uploadedFile.path) {
      await fs.rename(uploadedFile.path, finalPath);
    }
    return finalPath;
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
    const randomSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    if (field === Fields.Topic) {
      return `images/topics/${uniqueFileName(fileName, field)}`;
    }

    if (field === Fields.Media) {
      return `images/media/${new Date().toISOString().slice(0, 10)}/${field}-${randomSuffix}${extension}`;
    }

    if (field === Fields.PostFeatured) {
      return `images/posts/featured/${field}-${randomSuffix}${extension}`;
    }

    return `images/posts/content/${new Date().toISOString().slice(0, 10)}/${field}-${randomSuffix}${extension}`;
  }
}
