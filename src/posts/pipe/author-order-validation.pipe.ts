import { ERROR_MESSAGE } from '@/utils/constants/errors';
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { PostQueryDto } from '../dto/post-query.dto';

@Injectable()
export class AuthorOrderValidationPipe implements PipeTransform {
  transform(value: PostQueryDto, metadata: ArgumentMetadata) {
    if (value?.orderBy === 'author' && !value?.include?.author) {
      throw new BadRequestException(ERROR_MESSAGE.RELATION_IS_NOT_SET);
    }
    return value;
  }
}
