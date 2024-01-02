import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { Fields } from './constants/fields.enum';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    // FileInterceptor(Fields.Post || Fields.Topic || Fields.PostFeatured),
    FileFieldsInterceptor([
      { name: Fields.Post },
      { name: Fields.Topic },
      { name: Fields.PostFeatured },
    ]),
  )
  async uploadFile(
    @UploadedFiles()
    files: {
      [Fields.Post]: Express.Multer.File[];
      [Fields.Topic]: Express.Multer.File[];
      [Fields.PostFeatured]: Express.Multer.File[];
    },
  ) {
    return this.filesService.uploadFile(files);
  }
}
