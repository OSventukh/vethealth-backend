import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { PostStatusEnum } from '@/statuses/post-status.enum';

@Injectable()
export class PostStatusSeedService {
  constructor(
    @InjectRepository(PostStatusEntity)
    private readonly postStatusRepository: Repository<PostStatusEntity>,
  ) {}
  async run() {
    const count = await this.postStatusRepository.count();

    if (!count) {
      await this.postStatusRepository.save([
        this.postStatusRepository.create({
          id: PostStatusEnum.Publidhed,
          name: 'Published',
        }),
        this.postStatusRepository.create({
          id: PostStatusEnum.Draft,
          name: 'Draft',
        }),
        this.postStatusRepository.create({
          id: PostStatusEnum.OnReview,
          name: 'OnReview',
        }),
      ]);
    }
  }
}
