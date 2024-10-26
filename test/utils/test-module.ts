import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import {
  INestApplication,
  ValidationPipe,
  Type,
  Provider,
  CanActivate,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from '@/database/typeorm-config.service';
import { ConfigModule } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import databaseConfig from '@/config/database.config';
import appConfig from '@/config/app.config';
import { getDataSourceToken } from '@nestjs/typeorm';
import { RoleSeedModule } from '@/database/seeds/role/role-seed.module';
import { StatusSeedModule } from '@/database/seeds/status/status-seed.module';
import authConfig from '@/config/auth.config';
import { AuthGuard } from '@nestjs/passport';

interface CreateTestModule {
  imports?: Type<any>[];
  controllers?: Type<any>[];
  providers?: Provider[];
  mockAuthGuard?: boolean;
}

export async function createTestModule({
  imports,
  controllers,
  providers,
  mockAuthGuard = true,
}: CreateTestModule): Promise<{
  app: INestApplication;
  connection: DataSource;
}> {
  const mockedAuthGuard: CanActivate = { canActivate: jest.fn(() => true) };
  const moduleFixture = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [databaseConfig, appConfig, authConfig],
        envFilePath: ['.env.test'],
      }),
      TypeOrmModule.forRootAsync({
        useClass: TypeOrmConfigService,
        dataSourceFactory: async (options: DataSourceOptions) => {
          return new DataSource(options).initialize();
        },
      }),
      RoleSeedModule,
      StatusSeedModule,
      ...imports,
    ],
    controllers: controllers,
    providers: providers,
  })
    .overrideGuard(mockAuthGuard ? AuthGuard('jwt') : null)
    .useValue(mockAuthGuard ? mockedAuthGuard : null)
    .compile();
  const app = moduleFixture.createNestApplication();
  imports.forEach((module) => {
    useContainer(app.select(module), { fallbackOnErrors: true });
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const connection = app.get(getDataSourceToken());

  return { app, connection };
}
