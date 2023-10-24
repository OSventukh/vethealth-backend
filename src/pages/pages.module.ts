import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageEntity } from './entities/page.entity';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';

@Module({
  imports: [TypeOrmModule.forFeature([PageEntity])],
  controllers: [PagesController],
  providers: [PagesService, IsExist, IsValidIncludes, IsValidColumn],
})
export class PagesModule {}
