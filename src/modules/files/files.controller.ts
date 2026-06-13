import {
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
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
