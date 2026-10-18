import { FileEntity } from '@/modules/files/entities/file.entity';

export const MEDIA_USAGE_TYPES = ['post', 'page', 'topic'] as const;
export type MediaUsageType = (typeof MEDIA_USAGE_TYPES)[number];

/**
 * Де саме в матеріалі стоїть зображення: обкладинка поста, картинка теми,
 * текст/блоки контенту або OG/Twitter-зображення в метаданих.
 */
export type MediaUsageField = 'cover' | 'image' | 'content' | 'social';

export interface MediaUsage {
  type: MediaUsageType;
  id: string;
  title: string;
  slug: string;
  fields: MediaUsageField[];
}

export interface MediaDetails extends FileEntity {
  usages: MediaUsage[];
}

export interface BulkDeleteResult {
  deleted: string[];
  /** Пропущені, бо використовуються (лише без `force`). */
  inUse: { id: string; usages: MediaUsage[] }[];
}

export interface BackfillResult {
  updated: number;
  failed: { id: string; path: string; reason: string }[];
}

export const MEDIA_ERROR_CODES = {
  /** 409: зображення використовується; тіло містить `usages`. */
  IN_USE: 'MEDIA_IN_USE',
  /** 400: байти не декодуються як зображення (бите або не картинка). */
  UNSUPPORTED_FOR_AI: 'MEDIA_UNSUPPORTED_FOR_AI',
  /** 422: байти файлу недоступні (зовнішній URL або файл зник зі сховища). */
  NOT_READABLE: 'MEDIA_NOT_READABLE',
} as const;
