import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { Repository } from 'typeorm';
import { UserEntity } from '@/users/entities/user.entity';
import { RoleEnum } from '@/roles/roles.enum';
import { UserStatusEnum } from '@/statuses/user-statuses.enum';
import { AllConfigType } from '@/config/config.type';

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private repository: Repository<UserEntity>,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async run() {
    const countAdmin = await this.repository.count({
      where: {
        role: {
          id: RoleEnum.SuperAdmin,
        },
      },
    });

    if (!countAdmin) {
      await this.repository.save(
        this.repository.create({
          firstname: this.configService.getOrThrow('auth.adminName', {
            infer: true,
          }),
          email: this.configService.getOrThrow('auth.adminEmail', {
            infer: true,
          }),
          password: this.configService.getOrThrow('auth.adminPassword', {
            infer: true,
          }),
          role: {
            id: RoleEnum.SuperAdmin,
            name: 'Admin',
          },
          status: {
            id: UserStatusEnum.Active,
            name: 'Active',
          },
        }),
      );
    }
  }
}
