import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { ConfirmService } from './confirm.service';
import { ConfirmEntity } from './entities/confirm.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConfirmEntity])],
  providers: [ConfirmService],
  exports: [ConfirmService],
})
export class ConfirmModule {}
