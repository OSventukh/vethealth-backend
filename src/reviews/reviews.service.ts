import { Injectable } from '@nestjs/common';
import { ReviewEntity } from './entities/review.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { PaginationType } from '@/utils/types/pagination.type';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private reviewsRepository: Repository<ReviewEntity>,
  ) {}

  create(): Promise<ReviewEntity> {
    const review = this.reviewsRepository.create();
    return this.reviewsRepository.save(review);
  }

  findOne(fields: FindOptionsWhere<ReviewEntity>): Promise<ReviewEntity> {
    return this.reviewsRepository.findOne({ where: fields });
  }

  async findManyWithPagination(): Promise<PaginationType<ReviewEntity>> {
    const [items, count] = await this.reviewsRepository.findAndCount();

    return {
      items,
      count,
      currentPage: null,
      totalPages: null,
    };
  }

  update(
    id: ReviewEntity['id'],
    payload: DeepPartial<ReviewEntity>,
  ): Promise<ReviewEntity> {
    return this.reviewsRepository.save(
      this.reviewsRepository.create({ id, ...payload }),
    );
  }

  async softDelete(id: ReviewEntity['id']): Promise<void> {
    await this.reviewsRepository.softDelete(id);
  }
}
