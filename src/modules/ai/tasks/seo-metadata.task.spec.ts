import { seoMetadataSchema, seoMetadataTask } from './seo-metadata.task';

const RESULT = {
  metaTitle: 'Тестовий meta title',
  metaDescription: 'Тестовий meta description',
  metaKeywords: 'котики, песики',
  ogTitle: 'OG title',
  ogDescription: 'OG description',
};

describe('seoMetadataSchema', () => {
  it('accepts a complete result and trims the values', () => {
    const parsed = seoMetadataSchema.parse({
      ...RESULT,
      metaTitle: '  Тестовий meta title  ',
    });

    expect(parsed).toEqual(RESULT);
  });

  it('rejects a result with a missing field', () => {
    const { ogDescription: _ogDescription, ...incomplete } = RESULT;

    const result = seoMetadataSchema.safeParse(incomplete);

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).toContain('ogDescription');
  });

  it('rejects empty strings and non-string values', () => {
    expect(
      seoMetadataSchema.safeParse({ ...RESULT, metaTitle: '   ' }).success,
    ).toBe(false);
    expect(
      seoMetadataSchema.safeParse({ ...RESULT, metaKeywords: 42 }).success,
    ).toBe(false);
    expect(seoMetadataSchema.safeParse(null).success).toBe(false);
    expect(seoMetadataSchema.safeParse('текст').success).toBe(false);
  });
});

describe('seoMetadataTask.buildPrompt', () => {
  it('includes the title, topics and text', () => {
    const prompt = seoMetadataTask.buildPrompt({
      title: 'Отруєння у собак',
      text: 'Текст статті про отруєння.',
      topics: ['Собаки', 'Невідкладна допомога'],
    });

    expect(prompt).toContain('Заголовок статті: Отруєння у собак');
    expect(prompt).toContain('Розділи: Собаки, Невідкладна допомога');
    expect(prompt).toContain('Текст статті про отруєння.');
  });

  it('labels pages differently and omits empty topics', () => {
    const prompt = seoMetadataTask.buildPrompt({
      title: 'Про нас',
      text: 'Текст сторінки.',
      entityType: 'page',
    });

    expect(prompt).toContain('Заголовок сторінки: Про нас');
    expect(prompt).not.toContain('Розділи:');
  });

  it('truncates overly long text', () => {
    const prompt = seoMetadataTask.buildPrompt({
      title: 'Титул',
      text: 'а'.repeat(20000),
    });

    // 12000 символів тексту + промт-обгортка, але точно не всі 20000
    expect(prompt.length).toBeLessThan(13000);
    expect(prompt.endsWith('…')).toBe(true);
  });
});
