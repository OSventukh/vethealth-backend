import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Repository, Not, IsNull } from 'typeorm';

import { CategoryEntity } from '@/categories/entities/category.entity';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ChildrenInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(TopicEntity)
    private topicRepository: Repository<TopicEntity>,
    @InjectRepository(CategoryEntity)
    private categoryRepository: Repository<CategoryEntity>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    const topics = request.body.topics;
    const categories = request.body.categories;

    const parentTopics = await Promise.all(
      topics.map(async (topic) => {
        const entity = await this.topicRepository.findOne({
          where: { id: topic.id, parent: Not(IsNull()) },
          relations: ['parent'],
        });
        return entity && entity.parent ? { id: entity.parent.id } : null;
      }),
    );

    const parentCategories = await Promise.all(
      categories.map(async (category) => {
        const entity = await this.categoryRepository.findOne({
          where: { id: category.id, parent: Not(IsNull()) },
          relations: ['parent'],
        });
        return entity && entity.parent ? { id: entity.parent.id } : null;
      }),
    );

    request.body.topics = [
      ...topics,
      ...parentTopics.filter((id) => id !== null),
    ];
    request.body.categories = [
      ...categories,
      ...parentCategories.filter((id) => id !== null),
    ];

    return next.handle();
  }
}
