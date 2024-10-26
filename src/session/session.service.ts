import { Injectable } from '@nestjs/common';
import { SessionEntity } from './entities/session.entity';
import { DeepPartial, FindOptionsWhere, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '@/users/entities/user.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
  ) {}

  async findOne(
    options: FindOptionsWhere<SessionEntity>,
  ): Promise<SessionEntity | null> {
    return this.sessionRepository.findOne({
      where: options,
    });
  }

  async findMany(
    options: FindOptionsWhere<SessionEntity>,
  ): Promise<SessionEntity[]> {
    return this.sessionRepository.find({
      where: options,
    });
  }

  async create(data: DeepPartial<SessionEntity>): Promise<SessionEntity> {
    return this.sessionRepository.save(this.sessionRepository.create(data));
  }

  async softDelete({
    excludeId,
    ...criteria
  }: {
    id?: SessionEntity['id'];
    user?: Pick<UserEntity, 'id'>;
    excludeId?: SessionEntity['id'];
  }): Promise<void> {
    await this.sessionRepository.softDelete({
      ...criteria,
      id: criteria.id ? criteria.id : excludeId ? Not(excludeId) : undefined,
    });
  }
}
