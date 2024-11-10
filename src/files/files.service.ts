import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { Repository } from 'typeorm';
import { Fields } from './constants/fields.enum';
import appConfig from '@/config/app.config';
import { AppConfig } from '@/config/config.type';

type FileResponse = {
  id: string;
  host: string;
  path: string;
  relativePath: string;

}
type ImageResponse =
  | {
      [key in Fields]: FileResponse;
    }
  | object;

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
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

    for (const key in files) {

      const fileRepository = await this.fileRepository.save(
        this.fileRepository.create({
          path: '/' + files[key][0].path.replace(/\\/g, '/'),
        }),
      );
      imageResponse[key] = fileRepository;
    }
    return imageResponse;
  }
}
