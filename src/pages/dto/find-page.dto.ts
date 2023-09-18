import { PartialType } from '@nestjs/swagger';
import { CreatePageDto } from './create-page.dto';

export class PageWhereQueryDto extends PartialType(CreatePageDto) {}
