import { SeoEntityType, SeoField } from '@/modules/ai/tasks/seo-metadata.task';

export const SEO_ENTITY_TYPES: Record<SeoEntityType, SeoEntityType> = {
  post: 'post',
  page: 'page',
  topic: 'topic',
};

export type SeoFieldValues = Record<SeoField, string | null>;

/** Рядок екрана масового SEO: що це за матеріал і що вже заповнено. */
export interface SeoEntry {
  type: SeoEntityType;
  id: string;
  title: string;
  slug: string;
  status: string | null;
  /** Пост: слаги його тем (перша визначає URL). */
  topicSlugs?: string[];
  /** Тема: слаг батьківської теми (null — тема верхнього рівня). */
  parentSlug?: string | null;
  metadata: SeoFieldValues;
}
