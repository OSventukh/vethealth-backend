import {
  SEO_FIELDS,
  SeoField,
  seoMetadataSchema,
  seoMetadataTask,
  seoMetadataTaskFor,
} from './seo-metadata.task';

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

describe('targeted regeneration', () => {
  const input = { title: 'Бабезіоз', text: 'Текст про бабезіоз.' };

  it('asks only for the requested fields, with current values and hint', () => {
    const prompt = seoMetadataTask.buildPrompt({
      ...input,
      fields: ['metaTitle'],
      current: { metaTitle: 'Старий заголовок', ogTitle: '  ' },
      hint: 'коротше',
    });

    expect(prompt).toContain('- metaTitle: Старий заголовок');
    expect(prompt).not.toContain('- ogTitle:');
    expect(prompt).toContain('Згенеруй лише поля: metaTitle.');
    expect(prompt).toContain('Побажання редактора: коротше');
  });

  it('labels topics as sections', () => {
    expect(
      seoMetadataTask.buildPrompt({ ...input, entityType: 'topic' }),
    ).toContain('Заголовок розділу: Бабезіоз');
  });

  it('narrows the schema to the requested fields', () => {
    const task = seoMetadataTaskFor(['metaTitle', 'ogTitle']);

    expect(task.schema.parse({ ...RESULT })).toEqual({
      metaTitle: RESULT.metaTitle,
      ogTitle: RESULT.ogTitle,
    });
    expect(task.schema.safeParse({ metaTitle: 'Лише один' }).success).toBe(
      false,
    );
  });

  it.each<[SeoField[] | undefined]>([[undefined], [[]], [[...SEO_FIELDS]]])(
    'keeps the full task for fields %p',
    (fields) => {
      expect(seoMetadataTaskFor(fields)).toBe(seoMetadataTask);
      expect(seoMetadataTask.buildPrompt({ ...input, fields })).not.toContain(
        'Згенеруй лише поля',
      );
    },
  );
});
