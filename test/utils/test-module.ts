import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import {
  INestApplication,
  ValidationPipe,
  Type,
  Provider,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from '@/database/typeorm-config.service';
import { ConfigModule } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import databaseConfig from '@/config/database.config';
import appConfig from '@/config/app.config';
import { getDataSourceToken } from '@nestjs/typeorm';

interface CreateTestModule {
  imports?: Type<any>[];
  controllers?: Type<any>[];
  providers?: Provider[];
}

export async function createTestModule({
  imports,
  controllers,
  providers,
}: CreateTestModule): Promise<{
  app: INestApplication;
  connection: DataSource;
}> {
  const moduleFixture = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [databaseConfig, appConfig],
        envFilePath: ['.env.test'],
      }),
      TypeOrmModule.forRootAsync({
        useClass: TypeOrmConfigService,
        dataSourceFactory: async (options: DataSourceOptions) => {
          return new DataSource(options).initialize();
        },
      }),
      ...imports,
    ],
    controllers: controllers,
    providers: providers,
  }).compile();
  const app = moduleFixture.createNestApplication();
  imports.forEach((module) => {
    useContainer(app.select(module), { fallbackOnErrors: true });
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const connection = app.get(getDataSourceToken());

  return { app, connection };
}
