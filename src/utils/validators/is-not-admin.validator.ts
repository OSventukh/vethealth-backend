import { RoleEnum } from '@/roles/roles.enum';
import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ValidationArguments } from 'class-validator/types/validation/ValidationArguments';

@Injectable()
@ValidatorConstraint({ name: 'IsNotSuperAdmin', async: true })
export class IsNotSuperAdmin implements ValidatorConstraintInterface {
  async validate(
    value: { id: string | number },
    validationArguments: ValidationArguments,
  ) {
    if (value?.id?.toString() === RoleEnum.SuperAdmin) {
      return false;
    }
    return true;
  }
}
