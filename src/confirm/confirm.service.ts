import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfirmEntity } from './entities/confirm.entity';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';

@Injectable()
export class ConfirmService {
  constructor(
    @InjectRepository(ConfirmEntity)
    private readonly confirmRepository: Repository<ConfirmEntity>,
  ) {}

  async findOne(
    options: FindOptionsWhere<ConfirmEntity>,
  ): Promise<ConfirmEntity | null> {
    return this.confirmRepository.findOne({
      where: options,
    });
  }

  async findMany(
    options: FindOptionsWhere<ConfirmEntity>,
  ): Promise<ConfirmEntity[]> {
    return this.confirmRepository.find({
      where: options,
    });
  }

  async create(data: DeepPartial<ConfirmEntity>): Promise<ConfirmEntity> {
    return this.confirmRepository.save(this.confirmRepository.create(data));
  }

  async softDelete(id: ConfirmEntity['id']): Promise<void> {
    await this.confirmRepository.softDelete(id);
  }
}
