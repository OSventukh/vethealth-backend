import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MetadataEntity } from './entities/metadata.entity';
import { Repository } from 'typeorm';
import { CreateMetadataDto } from './dto/create-metadata.dto';
import { UpdateMetadataDto } from './dto/update-metadata.dto';

@Injectable()
export class MetadataService {
  constructor(
    @InjectRepository(MetadataEntity)
    private metadataRepository: Repository<MetadataEntity>,
  ) {}

  create(createMetadataDto: CreateMetadataDto) {
    const metadata = this.metadataRepository.create(createMetadataDto);
    return this.metadataRepository.save(metadata);
  }

  update(updateMetadataDto: UpdateMetadataDto) {
    return this.metadataRepository.save(updateMetadataDto);
  }

  delete(id: MetadataEntity['id']) {
    return this.metadataRepository.delete(id);
  }
}
