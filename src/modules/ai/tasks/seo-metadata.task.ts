import { z } from 'zod';
import { AiTask } from './ai-task';

export interface SeoMetadataInput {
  title: string;
  text: string;
  topics?: string[];
  entityType?: 'post' | 'page';
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

export const seoMetadataTask: AiTask<SeoMetadataInput, SeoMetadataResult> = {
  name: 'seo-metadata',
  schema: seoMetadataSchema,
  system: SYSTEM_PROMPT,
  maxOutputTokens: 2000,
  buildPrompt: ({ title, text, topics, entityType }) => {
    const kind = entityType === 'page' ? 'сторінки' : 'статті';
    const body =
      text.length > MAX_INPUT_CHARS
        ? `${text.slice(0, MAX_INPUT_CHARS)}…`
        : text;
    const topicsLine = topics?.length ? `\nРозділи: ${topics.join(', ')}` : '';

    return `Заголовок ${kind}: ${title}${topicsLine}\n\nТекст ${kind}:\n${body}`;
  },
};
