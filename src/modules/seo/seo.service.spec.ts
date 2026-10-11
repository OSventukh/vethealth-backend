import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-jest';
import { Repository } from 'typeorm';
import { AiService } from '@/modules/ai/ai.service';
import { MetadataEntity } from '@/modules/metadata/entities/metadata.entity';
import { PageEntity } from '@/modules/pages/entities/page.entity';
import { PostEntity } from '@/modules/posts/entities/post.entity';
import { TopicEntity } from '@/modules/topics/entities/topic.entity';
import { SeoService } from './seo.service';

// `ai` і `@ai-sdk/*` — ESM-only: приїжджають транзитивно через AiService
// (DI-токен; сам сервіс тут застабано), тож досить порожніх фабрик.
jest.mock('@ai-sdk/anthropic', () => ({ createAnthropic: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: jest.fn() }));
jest.mock('ai', () => ({
  generateObject: jest.fn(),
  createProviderRegistry: jest.fn(),
  APICallError: { isInstance: () => false },
  NoObjectGeneratedError: { isInstance: () => false },
  RetryError: { isInstance: () => false },
}));

const POST_ID = '11111111-1111-4111-8111-111111111111';

const lexical = (text: string) =>
  JSON.stringify({
    root: { children: [{ children: [{ type: 'text', text }] }] },
  });

const as = <T>(value: unknown) => value as T;

describe('SeoService', () => {
  let module: TestingModule;
  let service: SeoService;
  let posts: jest.Mocked<Repository<PostEntity>>;
  let pages: jest.Mocked<Repository<PageEntity>>;
  let topics: jest.Mocked<Repository<TopicEntity>>;
  let metadata: jest.Mocked<Repository<MetadataEntity>>;
  let generateSeoMetadata: jest.Mock;

  beforeEach(async () => {
    generateSeoMetadata = jest.fn().mockResolvedValue({ metaTitle: 'Новий' });

    module = await Test.createTestingModule({
      providers: [
        SeoService,
        ...[PostEntity, PageEntity, TopicEntity, MetadataEntity].map(
          (entity) => ({
            provide: getRepositoryToken(entity),
            useValue: createMock<Repository<unknown>>(),
          }),
        ),
        { provide: AiService, useValue: { generateSeoMetadata } },
      ],
    }).compile();

    service = module.get(SeoService);
    posts = module.get(getRepositoryToken(PostEntity));
    pages = module.get(getRepositoryToken(PageEntity));
    topics = module.get(getRepositoryToken(TopicEntity));
    metadata = module.get(getRepositoryToken(MetadataEntity));
  });

  afterEach(async () => {
    await module.close();
  });

  describe('findEntries', () => {
    it('lists topics, posts and standalone pages with their SEO fields', async () => {
      topics.find.mockResolvedValue(
        as([
          {
            id: 't1',
            title: 'Препарати',
            slug: 'drugs',
            status: { name: 'active' },
            parent: null,
            page: { id: 'p-attached' },
            metadata: { metaTitle: 'Довідник', ogImage: 'x.jpg' },
          },
        ]),
      );
      posts.find.mockResolvedValue(
        as([
          {
            id: 'a1',
            title: 'Бабезіоз',
            slug: 'babesiosis',
            status: { name: 'Published' },
            topics: [{ slug: 'dogs' }],
            metadata: null,
          },
        ]),
      );
      pages.find.mockResolvedValue(
        as([
          { id: 'p-attached', title: 'Сторінка теми', slug: 'drugs-page' },
          {
            id: 'p2',
            title: 'Політика',
            slug: 'privacy-policy',
            status: { name: 'Draft' },
          },
        ]),
      );

      const entries = await service.findEntries();

      expect(entries.map((entry) => entry.id)).toEqual(['t1', 'a1', 'p2']);
      expect(entries[0]).toMatchObject({
        type: 'topic',
        status: 'active',
        parentSlug: null,
        metadata: { metaTitle: 'Довідник', metaDescription: null },
      });
      expect(entries[0].metadata).not.toHaveProperty('ogImage');
      expect(entries[1]).toMatchObject({
        type: 'post',
        topicSlugs: ['dogs'],
        metadata: { metaTitle: null },
      });
      expect(entries[2]).toMatchObject({ type: 'page', status: 'Draft' });
    });
  });

  describe('update', () => {
    it('updates the existing metadata row in place', async () => {
      posts.findOne.mockResolvedValue(
        as({
          id: POST_ID,
          metadata: { id: 'm1', metaTitle: 'Старий', ogImage: 'x.jpg' },
        }),
      );
      metadata.save.mockImplementation(async (value) => value as never);

      const result = await service.update('post', POST_ID, {
        metaTitle: '  Новий  ',
        metaKeywords: '',
      });

      expect(metadata.save).toHaveBeenCalledWith({
        id: 'm1',
        metaTitle: 'Новий',
        metaKeywords: null,
        ogImage: 'x.jpg',
      });
      expect(posts.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        metaTitle: 'Новий',
        metaDescription: null,
        metaKeywords: null,
        ogTitle: null,
        ogDescription: null,
      });
    });

    it('creates and links a metadata row when there is none', async () => {
      topics.findOne.mockResolvedValue(as({ id: POST_ID, metadata: null }));
      metadata.create.mockImplementation((value) => value as never);
      metadata.save.mockImplementation(
        async (value) => ({ ...value, id: 'm-new' }) as never,
      );

      await service.update('topic', POST_ID, { ogTitle: 'OG' });

      expect(metadata.save).toHaveBeenCalledWith({ ogTitle: 'OG' });
      expect(topics.update).toHaveBeenCalledWith(POST_ID, {
        metadata: { id: 'm-new' },
      });
    });

    it('throws 404 for an unknown entity', async () => {
      pages.findOne.mockResolvedValue(null);

      await expect(service.update('page', POST_ID, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generate', () => {
    it('builds the post source from its text and topics', async () => {
      posts.findOne.mockResolvedValue(
        as({
          id: POST_ID,
          title: 'Бабезіоз',
          content: lexical('Текст статті'),
          topics: [{ title: 'Собаки' }],
        }),
      );

      const result = await service.generate('post', POST_ID, {
        fields: ['metaTitle'],
        hint: 'коротше',
      });

      expect(result).toEqual({ metaTitle: 'Новий' });
      expect(generateSeoMetadata).toHaveBeenCalledWith({
        entityType: 'post',
        title: 'Бабезіоз',
        text: 'Текст статті',
        topics: ['Собаки'],
        fields: ['metaTitle'],
        hint: 'коротше',
      });
    });

    it('lists every child of a root section, like the public page', async () => {
      topics.findOne.mockResolvedValue(
        as({
          id: POST_ID,
          title: 'Препарати',
          description: 'Опис розділу',
          contentType: 'page',
          page: {
            status: { name: 'Published' },
            content: JSON.stringify({
              blocks: [{ data: { title: 'Прихована сторінка' } }],
            }),
          },
          children: [
            { title: 'Ізоксазоліни', status: { name: 'Active' } },
            { title: 'Неактивний розділ', status: { name: 'Inactive' } },
          ],
        }),
      );
      await service.generate('topic', POST_ID, {});
      const input = generateSeoMetadata.mock.calls[0][0];
      expect(input.text).toContain(
        'Підрозділи: Ізоксазоліни; Неактивний розділ',
      );
      expect(input.text).not.toContain('Прихована сторінка');
      expect(posts.find).not.toHaveBeenCalled();
    });

    it('does not use a hidden attached page when the section has only inactive children', async () => {
      topics.findOne.mockResolvedValue(
        as({
          id: POST_ID,
          title: 'Розділ',
          description: 'Опис розділу',
          contentType: 'page',
          page: {
            status: { name: 'Published' },
            content: lexical('Прихована сторінка'),
          },
          children: [
            { title: 'Неактивний підрозділ', status: { name: 'Inactive' } },
          ],
        }),
      );
      await service.generate('topic', POST_ID, {});
      expect(generateSeoMetadata.mock.calls[0][0].text).toBe(
        'Опис розділу\n\nПідрозділи: Неактивний підрозділ',
      );
    });

    it('uses only published posts for a post listing and ignores an attached page', async () => {
      topics.findOne.mockResolvedValue(
        as({
          id: POST_ID,
          title: 'Препарати',
          contentType: 'post',
          children: [],
          page: {
            status: { name: 'Published' },
            content: lexical('Прихований текст'),
          },
        }),
      );
      posts.find.mockResolvedValue(as([{ title: 'Амідини' }]));
      await service.generate('topic', POST_ID, {});
      const input = generateSeoMetadata.mock.calls[0][0];
      expect(posts.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { topics: { id: POST_ID }, status: { name: 'Published' } },
        }),
      );
      expect(input.text).toContain('Амідини');
      expect(input.text).not.toContain('Прихований');
    });

    it.each(['Draft', 'Published'])(
      'uses an attached page only if published (%s)',
      async (status) => {
        topics.findOne.mockResolvedValue(
          as({
            id: POST_ID,
            title: 'Препарати',
            description: 'Опис',
            contentType: 'page',
            parent: { title: 'Довідник' },
            children: [],
            page: {
              status: { name: status },
              content: lexical('Текст сторінки'),
            },
          }),
        );
        await service.generate('topic', POST_ID, {
          primaryKeyword: 'препарати',
        });
        const input = generateSeoMetadata.mock.calls[0][0];
        expect(input.text.includes('Текст сторінки')).toBe(
          status === 'Published',
        );
        expect(input.primaryKeyword).toBe('препарати');
        expect(input.topics).toEqual(['Довідник']);
        expect(posts.find).not.toHaveBeenCalled();
      },
    );

    it('rejects an entity without text before calling the AI', async () => {
      pages.findOneBy.mockResolvedValue(
        as({ id: POST_ID, title: 'Порожня', content: '' }),
      );

      await expect(service.generate('page', POST_ID, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(generateSeoMetadata).not.toHaveBeenCalled();
    });
  });
});
