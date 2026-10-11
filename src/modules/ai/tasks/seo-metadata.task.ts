import { z } from 'zod';
import { AiTask } from './ai-task';

export const SEO_FIELDS = [
  'metaTitle',
  'metaDescription',
  'metaKeywords',
  'ogTitle',
  'ogDescription',
] as const;

export type SeoField = (typeof SEO_FIELDS)[number];

export type SeoEntityType = 'post' | 'page' | 'topic';

export interface SeoMetadataInput {
  title: string;
  text: string;
  topics?: string[];
  entityType?: SeoEntityType;
  /** Згенерувати лише ці поля (точкова перегенерація). Без — усі. */
  fields?: SeoField[];
  /** Поточні значення полів — контекст, щоб нові з ними узгоджувалися. */
  current?: Partial<Record<SeoField, string>>;
  /** Побажання редактора до результату («коротше», «згадай кліщів»). */
  hint?: string;
}

const MAX_INPUT_CHARS = 12000;

export const seoMetadataSchema = z.object({
  metaTitle: z
    .string()
    .trim()
    .min(1)
    .describe(
      'SEO-заголовок 40-60 символів українською, з головним пошуковим запитом, без назви сайту',
    ),
  metaDescription: z
    .string()
    .trim()
    .min(1)
    .describe(
      'Мета-опис 120-160 символів українською: конкретний, з ключовим запитом і користю для читача',
    ),
  metaKeywords: z
    .string()
    .trim()
    .min(1)
    .describe('4-8 ключових фраз українською через кому'),
  ogTitle: z
    .string()
    .trim()
    .min(1)
    .describe(
      'Заголовок для соцмереж до 60 символів, може бути трохи емоційнішим за metaTitle',
    ),
  ogDescription: z
    .string()
    .trim()
    .min(1)
    .describe('Опис для соцмереж до 200 символів'),
});

export type SeoMetadataResult = z.infer<typeof seoMetadataSchema>;

const SYSTEM_PROMPT = `Ти — SEO-редактор українського ветеринарного сайту VetHealth (vethealth.com.ua) з довідковими статтями про здоровʼя тварин, їх лікування, догляд і ветеринарні препарати.
На основі заголовка і тексту згенеруй SEO-мета-поля українською мовою.
Вимоги:
- metaTitle: 40-60 символів, містить головний пошуковий запит, без назви сайту і без лапок.
- metaDescription: 120-160 символів, конкретний і корисний, з ключовим запитом; без клікбейту і загальних фраз.
- metaKeywords: 4-8 ключових фраз через кому, у називному відмінку, від найважливішої до найменш важливої.
- ogTitle: до 60 символів, для соцмереж.
- ogDescription: до 200 символів, для соцмереж.
Пиши природною українською, без канцеляризмів і без вигаданих фактів — спирайся лише на наданий текст.`;

const ENTITY_LABELS: Record<SeoEntityType, string> = {
  post: 'статті',
  page: 'сторінки',
  topic: 'розділу',
};

export const seoMetadataTask: AiTask<
  SeoMetadataInput,
  Partial<SeoMetadataResult>
> = {
  name: 'seo-metadata',
  schema: seoMetadataSchema,
  system: SYSTEM_PROMPT,
  maxOutputTokens: 2000,
  buildPrompt: ({ title, text, topics, entityType, fields, current, hint }) => {
    const kind = ENTITY_LABELS[entityType ?? 'post'];
    const body =
      text.length > MAX_INPUT_CHARS
        ? `${text.slice(0, MAX_INPUT_CHARS)}…`
        : text;
    const topicsLine = topics?.length ? `\nРозділи: ${topics.join(', ')}` : '';
    const parts = [
      `Заголовок ${kind}: ${title}${topicsLine}\n\nТекст ${kind}:\n${body}`,
    ];

    const currentLines = SEO_FIELDS.filter((field) =>
      current?.[field]?.trim(),
    ).map((field) => `- ${field}: ${current[field].trim()}`);
    if (currentLines.length) {
      parts.push(
        `Поточні SEO-поля (узгодь нові з ними; поля, які генеруєш, напиши заново і краще, ніж зараз):\n${currentLines.join('\n')}`,
      );
    }
    if (isSubset(fields)) {
      parts.push(`Згенеруй лише поля: ${fields.join(', ')}.`);
    }
    if (hint?.trim()) {
      parts.push(`Побажання редактора: ${hint.trim()}`);
    }

    return parts.join('\n\n');
  },
};

function isSubset(fields: SeoField[] | undefined): boolean {
  return Boolean(fields?.length) && fields.length < SEO_FIELDS.length;
}

/**
 * Задача під точкову перегенерацію: схема звужується до запитаних полів,
 * тож модель не витрачає токени на решту, а SDK не вимагає їх у відповіді.
 */
export function seoMetadataTaskFor(
  fields?: SeoField[],
): AiTask<SeoMetadataInput, Partial<SeoMetadataResult>> {
  if (!isSubset(fields)) {
    return seoMetadataTask;
  }
  const mask = Object.fromEntries(fields.map((field) => [field, true])) as {
    [K in SeoField]?: true;
  };

  return { ...seoMetadataTask, schema: seoMetadataSchema.pick(mask) };
}
