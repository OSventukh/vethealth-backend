import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStatusEntity } from '@/statuses/entities/user-status.entity';
import { UserStatusEnum } from '@/statuses/user-statuses.enum';

@Injectable()
export class UserStatusSeedService {
  constructor(
    @InjectRepository(UserStatusEntity)
    private readonly userStatusRepository: Repository<UserStatusEntity>,
  ) {}
  async run() {
    const count = await this.userStatusRepository.count();

    if (!count) {
      await this.userStatusRepository.save([
        this.userStatusRepository.create({
          id: UserStatusEnum.Active,
          name: 'Active',
        }),
        this.userStatusRepository.create({
          id: UserStatusEnum.Pending,
          name: 'Pending',
        }),
        this.userStatusRepository.create({
          id: UserStatusEnum.Blocked,
          name: 'Blocked',
        }),
      ]);
    }
  }
}
