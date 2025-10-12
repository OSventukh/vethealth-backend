import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetadataEntity } from './entities/metadata.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MetadataEntity])],
})
export class MetadataModule {}
