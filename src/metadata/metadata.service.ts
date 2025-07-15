import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { MetadataEntity } from './entities/metadata.entity';
import { CreateMetadataDto } from './dto/create-metadata.dto';
import { UpdateMetadataDto } from './dto/update-metadata.dto';

@Injectable()
export class MetadataService {
  constructor(
    @InjectRepository(MetadataEntity)
    private metadataRepository: Repository<MetadataEntity>,
  ) {}

  async create(createMetadataDto: CreateMetadataDto): Promise<MetadataEntity> {
    const metadata = this.metadataRepository.create(createMetadataDto as DeepPartial<MetadataEntity>);
    return await this.metadataRepository.save(metadata);
  }

  async findOne(id: string): Promise<MetadataEntity | null> {
    return await this.metadataRepository.findOne({ where: { id } });
  }

  async update(id: string, updateMetadataDto: UpdateMetadataDto): Promise<MetadataEntity> {
    await this.metadataRepository.update(id, updateMetadataDto as DeepPartial<MetadataEntity>);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.metadataRepository.delete(id);
  }

  /**
   * Create or update metadata for an entity
   */
  async upsert(metadataData: CreateMetadataDto | UpdateMetadataDto, existingMetadataId?: string): Promise<MetadataEntity> {
    if (existingMetadataId) {
      return await this.update(existingMetadataId, metadataData);
    }
    return await this.create(metadataData as CreateMetadataDto);
  }

  /**
   * Get fallback metadata based on entity properties
   */
  getFallbackMetadataData(entity: any): Partial<MetadataEntity> {
    const fallback: Partial<MetadataEntity> = {};

    // Meta title fallback
    if (!entity.metadata?.metaTitle) {
      fallback.metaTitle = entity.title || entity.name;
    }

    // Meta description fallback
    if (!entity.metadata?.metaDescription) {
      if (entity.description) {
        fallback.metaDescription = entity.description;
      } else if (entity.content) {
        // Extract first 160 characters from content
        try {
          const parsed = JSON.parse(entity.content);
          const firstParagraph = parsed?.root?.children?.[0]?.children?.[0]?.text;
          if (firstParagraph) {
            fallback.metaDescription = firstParagraph.substring(0, 160);
          }
        } catch (error) {
          fallback.metaDescription = entity.content.substring(0, 160);
        }
      }
    }

    // Meta image fallback
    if (!entity.metadata?.metaImage) {
      if (entity.image) {
        fallback.metaImage = entity.image;
      } else if (entity.featuredImageFile) {
        fallback.metaImage = entity.featuredImageFile;
      }
    }

    return fallback;
  }
}
