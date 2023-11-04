import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { TopicsModule } from './topics/topics.module';
import { CategoriesModule } from './categories/categories.module';
import { PagesModule } from './pages/pages.module';
import { AuthModule } from './auth/auth.module';
import { HomeModule } from './home/home.module';
import { FilesModule } from './files/files.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SessionModule } from './session/session.module';
import { ForgotModule } from './forgot/forgot.module';
import { ConfirmModule } from './confirm/confirm.module';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig, authConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    }),
    UsersModule,
    PostsModule,
    TopicsModule,
    CategoriesModule,
    PagesModule,
    AuthModule,
    HomeModule,
    FilesModule,
    ReviewsModule,
    NotificationsModule,
    SessionModule,
    ForgotModule,
    ConfirmModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
