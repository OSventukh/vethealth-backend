import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ForgotService } from './forgot.service';
import { ForgotEntity } from './entities/forgot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ForgotEntity])],
  providers: [ForgotService],
  exports: [ForgotService],
})
export class ForgotModule {}
