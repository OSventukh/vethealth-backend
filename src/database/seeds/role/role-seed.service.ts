import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '@/roles/entities/role.entity';
import { RoleEnum } from '@/roles/roles.enum';

@Injectable()
export class RoleSeedService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}
  async run() {
    const count = await this.roleRepository.count();

    if (!count) {
      await this.roleRepository.save([
        this.roleRepository.create({
          id: RoleEnum.SuperAdmin,
          name: 'Super Administrator',
        }),
        this.roleRepository.create({
          id: RoleEnum.Admin,
          name: 'Administrator',
        }),
        this.roleRepository.create({
          id: RoleEnum.Moder,
          name: 'Moderator',
        }),
        this.roleRepository.create({
          id: RoleEnum.Writer,
          name: 'Writer',
        }),
      ]);
    }
  }
}
