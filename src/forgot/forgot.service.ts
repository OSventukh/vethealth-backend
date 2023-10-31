import { Injectable } from '@nestjs/common';
import { ForgotEntity } from './entities/forgot.entity';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ForgotService {
  constructor(
    @InjectRepository(ForgotEntity)
    private readonly forgotRepository: Repository<ForgotEntity>,
  ) {}

  async findOne(
    options: FindOptionsWhere<ForgotEntity>,
  ): Promise<ForgotEntity | null> {
    return this.forgotRepository.findOne({
      where: options,
    });
  }

  async findMany(
    options: FindOptionsWhere<ForgotEntity>,
  ): Promise<ForgotEntity[]> {
    return this.forgotRepository.find({
      where: options,
    });
  }

  async create(data: DeepPartial<ForgotEntity>): Promise<ForgotEntity> {
    return this.forgotRepository.save(this.forgotRepository.create(data));
  }

  async softDelete(id: ForgotEntity['id']): Promise<void> {
    await this.forgotRepository.softDelete(id);
  }
}
