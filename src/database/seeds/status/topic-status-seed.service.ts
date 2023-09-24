import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TopicStatusEntity } from '@/statuses/entities/topic-status.entity';
import { TopicStatusEnum } from '@/statuses/topic-status.enum';

@Injectable()
export class TopicStatusSeedService {
  constructor(
    @InjectRepository(TopicStatusEntity)
    private readonly topicStatusRepository: Repository<TopicStatusEntity>,
  ) {}
  async run() {
    const count = await this.topicStatusRepository.count();

    if (!count) {
      await this.topicStatusRepository.save([
        this.topicStatusRepository.create({
          id: TopicStatusEnum.Active,
          name: 'Active',
        }),
        this.topicStatusRepository.create({
          id: TopicStatusEnum.Inactive,
          name: 'Inactive',
        }),
      ]);
    }
  }
}
