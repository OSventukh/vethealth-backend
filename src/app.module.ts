import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { ConfirmModule } from './confirm/confirm.module';
import { MailerModule } from './mailer/mailer.module';
import { MailModule } from './mail/mail.module';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import { CookieResolver, I18nModule } from 'nestjs-i18n';
import { AllConfigType } from './config/config.type';
import path from 'path';

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
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true },
      }),
      resolvers: [{ use: CookieResolver, options: ['lang'] }],
      imports: [ConfigModule],
      inject: [ConfigService],
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
    ConfirmModule,
    MailerModule,
    MailModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
