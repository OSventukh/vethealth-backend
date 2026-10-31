import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { Fields } from './constants/fields.enum';
import { UploadPresignedDto } from './dto/upload-presigned.dto';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiBearerAuth()
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
      { name: Fields.Media },
    ]),
  )
  async uploadFile(
    @UploadedFiles()
    files: Partial<Record<Fields, Express.Multer.File[]>>,
  ) {
    return this.filesService.uploadFile(files);
  }

  @ApiBearerAuth()
  @Post('upload-presigned')
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            path: { type: 'string' },
            relativePath: { type: 'string' },
          },
        },
        uploadSignedUrl: { type: 'string' },
      },
    },
  })
  async createPresignedUpload(@Body() input: UploadPresignedDto) {
    return this.filesService.createPresignedUpload(input);
  }
}
