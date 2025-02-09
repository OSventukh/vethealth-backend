import { ERROR_MESSAGE } from '@/utils/constants/errors';
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { CreatePostDto } from '../dto/create-post.dto';

@Injectable()
export class FeaturedImagePipe implements PipeTransform {
  transform(value: CreatePostDto, metadata: ArgumentMetadata) {
    if (value.featuredImageFile?.id && value.featuredImageUrl) {
      throw new BadRequestException(ERROR_MESSAGE.FEATURED_IMAGE_NOT_VALID);
    }
    return value;
  }
}
