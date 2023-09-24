import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageEntity } from './entities/page.entity';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { IsExist } from '@/utils/validators/is-exist.validator';

@Module({
  imports: [TypeOrmModule.forFeature([PageEntity])],
  controllers: [PagesController],
  providers: [PagesService, IsExist],
})
export class PagesModule {}
