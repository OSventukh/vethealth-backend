import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ValidationArguments } from 'class-validator/types/validation/ValidationArguments';

@Injectable()
@ValidatorConstraint({ name: 'IsValidIncludes', async: true })
export class IsValidIncludes implements ValidatorConstraintInterface {
  async validate(value: string, validationArguments: ValidationArguments) {
    const validValues: string[] = validationArguments.constraints;
    if (!value) {
      return true;
    }

    if (!Array.isArray(validValues) || validValues.length === 0) {
      return false;
    }

    let values: string[] = [];

    if (typeof value === 'string') {
      values = value?.split(',');
    }

    if (typeof value === 'object') {
      values = Object.keys(value);
    }

    return values.every((value) => validValues.includes(value));
  }
}
