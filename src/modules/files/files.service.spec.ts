import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { FileEntity } from './entities/file.entity';
import { createMock } from '@golevelup/ts-jest';
import { FilesService } from './files.service';
import { AllConfigType, FileStorageDriver } from '@/config/config.type';
import { FileStorageFactory } from './storage/file-storage.factory';

describe('FilesService', () => {
  let module: TestingModule;
  let filesService: FilesService;
  let filesRepositry: Repository<FileEntity>;
  const configServiceMock = {
    getOrThrow: jest.fn().mockReturnValue(FileStorageDriver.Local),
  } as unknown as ConfigService<AllConfigType>;
  const fileStorageFactoryMock = {
    getStorage: jest.fn(),
  } as unknown as FileStorageFactory;
  const FILE_REPOSITORY_TOKEN = getRepositoryToken(FileEntity);

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: FILE_REPOSITORY_TOKEN,
          useValue: createMock<Repository<FileEntity>>(),
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: FileStorageFactory,
          useValue: fileStorageFactoryMock,
        },
      ],
    }).compile();

    filesService = module.get<FilesService>(FilesService);
    filesRepositry = module.get<Repository<FileEntity>>(FILE_REPOSITORY_TOKEN);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(filesService).toBeDefined();
  });

  it('should call a fileRepository.create() method with object that have path property and file path value', async () => {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('This is a test file'),
      size: 100,
      path: 'path-to-file',
    } as Express.Multer.File;

    await filesService.uploadFile({
      post: [file],
      topic: [file],
      'post-featured': [file],
    });
    expect(filesRepositry.create).toBeCalledWith({ path: '/' + file.path });
  });
});
