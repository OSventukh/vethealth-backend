import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

describe('FilesController', () => {
  let module: TestingModule;
  let filesController: FilesController;
  let filesService: FilesService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: FilesService, useValue: createMock<FilesService>() },
      ],
    }).compile();

    filesController = module.get<FilesController>(FilesController);
    filesService = module.get<FilesService>(FilesService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(filesController).toBeDefined();
  });

  it('should call a fileService.uploadFile() method with file argument', () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('This is a test file'),
      size: 100,
    } as Express.Multer.File;

    filesController.uploadFile(file);
    expect(filesService.uploadFile).toBeCalledWith(file);
  });
});
