import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetadataEntity } from './entities/metadata.entity';
import { MetadataService } from './metadata.service';

@Module({
  imports: [TypeOrmModule.forFeature([MetadataEntity])],
  providers: [MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
