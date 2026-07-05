import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { Public } from '@/roles/decorators/public.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  getSearchedPosts(@Query() searchQueryDto: SearchQueryDto) {
    return this.searchService.findManyWithPagination(searchQueryDto);
  }
}
