import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '@/modules/ai/ai.service';
import { SeoGenerationOptionsDto } from '@/modules/ai/dto/seo-generation-options.dto';
import { SeoMetadataFieldsDto } from '@/modules/ai/dto/seo-metadata-fields.dto';
import {
  SEO_FIELDS,
  SeoEntityType,
  SeoMetadataInput,
  SeoMetadataResult,
} from '@/modules/ai/tasks/seo-metadata.task';
import { MetadataEntity } from '@/modules/metadata/entities/metadata.entity';
import { PageEntity } from '@/modules/pages/entities/page.entity';
import { PostEntity } from '@/modules/posts/entities/post.entity';
import { TopicEntity } from '@/modules/topics/entities/topic.entity';
import { lexicalContentText, pageBlocksText } from '@/utils/content-text';
import { SeoEntry, SeoFieldValues } from './seo.types';

const PUBLISHED = 'Published';

/** Спільне для поста, сторінки й теми — те, з чим працює цей сервіс. */
interface SeoTarget {
  id: string;
  metadata?: MetadataEntity;
}

@Injectable()
export class SeoService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepository: Repository<PostEntity>,
    @InjectRepository(PageEntity)
    private readonly pagesRepository: Repository<PageEntity>,
    @InjectRepository(TopicEntity)
    private readonly topicsRepository: Repository<TopicEntity>,
    @InjectRepository(MetadataEntity)
    private readonly metadataRepository: Repository<MetadataEntity>,
    private readonly aiService: AiService,
  ) {}

  /**
   * Усі матеріали з публічною URL і їхні SEO-поля. Сторінки, привʼязані до
   * теми, пропускаємо: на сайті їх URL — це URL теми, і мета береться з неї.
   */
  async findEntries(): Promise<SeoEntry[]> {
    const [posts, pages, topics] = await Promise.all([
      this.postsRepository.find({
        relations: { metadata: true, topics: true },
        order: { createdAt: 'DESC' },
      }),
      this.pagesRepository.find({
        relations: { metadata: true },
        order: { title: 'ASC' },
      }),
      this.topicsRepository.find({
        relations: { metadata: true, parent: true, page: true },
        order: { title: 'ASC' },
      }),
    ]);
    const topicPageIds = new Set(
      topics.map((topic) => topic.page?.id).filter(Boolean),
    );

    return [
      ...topics.map((topic) =>
        this.toEntry('topic', topic, {
          status: topic.status?.name ?? null,
          parentSlug: topic.parent?.slug ?? null,
        }),
      ),
      ...posts.map((post) =>
        this.toEntry('post', post, {
          status: post.status?.name ?? null,
          topicSlugs: (post.topics ?? []).map((topic) => topic.slug),
        }),
      ),
      ...pages
        .filter((page) => !topicPageIds.has(page.id))
        .map((page) =>
          this.toEntry('page', page, { status: page.status?.name ?? null }),
        ),
    ];
  }

  /** Генерує мета-поля з контенту матеріалу. Нічого не зберігає. */
  async generate(
    type: SeoEntityType,
    id: string,
    options: SeoGenerationOptionsDto,
  ): Promise<Partial<SeoMetadataResult>> {
    const source = await this.buildSource(type, id);
    if (!source.text.trim()) {
      throw new BadRequestException('There is no text to generate SEO from', {
        errorCode: 'SEO_NO_CONTENT',
      });
    }

    return this.aiService.generateSeoMetadata({ ...source, ...options });
  }

  /**
   * Оновлює SEO-поля матеріалу на місці (рядок `metadata` не дублюється).
   * Передані поля перезаписуються, порожній рядок очищає поле, решта
   * (і несеошні колонки на кшталт ogImage) лишаються як були.
   */
  async update(
    type: SeoEntityType,
    id: string,
    dto: SeoMetadataFieldsDto,
  ): Promise<SeoFieldValues> {
    const repository = this.repositoryFor(type);
    const target = await repository.findOne({
      where: { id },
      relations: { metadata: true },
    });
    if (!target) {
      throw new NotFoundException();
    }

    const values: Partial<SeoFieldValues> = {};
    for (const field of SEO_FIELDS) {
      if (dto[field] !== undefined) {
        values[field] = dto[field].trim() || null;
      }
    }

    if (target.metadata) {
      const saved = await this.metadataRepository.save({
        ...target.metadata,
        ...values,
      });
      return pickSeoFields(saved);
    }

    const created = await this.metadataRepository.save(
      this.metadataRepository.create(values),
    );
    // update(), а не save(): без хуків сутності (слаги) і без перезапису
    // решти колонок — лише зовнішній ключ.
    await repository.update(id, { metadata: { id: created.id } });
    return pickSeoFields(created);
  }

  private toEntry(
    type: SeoEntityType,
    target: SeoTarget & { title: string; slug: string },
    extra: Pick<SeoEntry, 'status'> & Partial<SeoEntry>,
  ): SeoEntry {
    return {
      type,
      id: target.id,
      title: target.title,
      slug: target.slug,
      metadata: pickSeoFields(target.metadata),
      ...extra,
    };
  }

  private async buildSource(
    type: SeoEntityType,
    id: string,
  ): Promise<SeoMetadataInput> {
    if (type === 'post') {
      const post = await this.postsRepository.findOne({
        where: { id },
        relations: { topics: true },
      });
      if (!post) {
        throw new NotFoundException();
      }
      return {
        entityType: 'post',
        title: post.title,
        text: lexicalContentText(post.content),
        topics: post.topics?.map((topic) => topic.title),
      };
    }

    if (type === 'page') {
      const page = await this.pagesRepository.findOneBy({ id });
      if (!page) {
        throw new NotFoundException();
      }
      return {
        entityType: 'page',
        title: page.title,
        text: pageBlocksText(page.content),
      };
    }

    const topic = await this.topicsRepository.findOne({
      where: { id },
      relations: {
        parent: true,
        page: true,
        children: true,
        posts: { status: true },
      },
    });
    if (!topic) {
      throw new NotFoundException();
    }
    // У теми власного тексту мало: опис, сторінка (якщо привʼязана) і
    // перелік того, що в розділі є — з цього модель і зрозуміє тему.
    // Чернетки в промт не йдуть: їхні назви не мають потрапити в мета.
    const posts = (topic.posts ?? [])
      .filter((post) => post.status?.name === PUBLISHED)
      .map((post) => post.title);
    const children = (topic.children ?? []).map((child) => child.title);
    const text = [
      topic.description,
      topic.page ? pageBlocksText(topic.page.content) : '',
      children.length ? `Підрозділи: ${children.join('; ')}` : '',
      posts.length ? `Статті розділу: ${posts.join('; ')}` : '',
    ]
      .filter((part) => part?.trim())
      .join('\n\n');

    return {
      entityType: 'topic',
      title: topic.title,
      text,
      topics: topic.parent ? [topic.parent.title] : undefined,
    };
  }

  private repositoryFor(type: SeoEntityType): Repository<SeoTarget> {
    const repositories = {
      post: this.postsRepository,
      page: this.pagesRepository,
      topic: this.topicsRepository,
    };
    return repositories[type] as unknown as Repository<SeoTarget>;
  }
}

function pickSeoFields(
  metadata: Partial<MetadataEntity> | null | undefined,
): SeoFieldValues {
  return Object.fromEntries(
    SEO_FIELDS.map((field) => [field, metadata?.[field] ?? null]),
  ) as SeoFieldValues;
}
