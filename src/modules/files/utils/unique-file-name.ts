import * as path from 'node:path';
import slugify from 'slugify';

/**
 * Читабельне й унікальне імʼя файлу: slug назви + час + випадковий суфікс.
 * Суфікс обовʼязковий — раніше картинки тем зберігались під голим slug, і
 * файл іншої теми з тим самим іменем тихо перезаписував попередній у сховищі.
 */
export function uniqueFileName(originalName: string, fallback: string): string {
  // basename відрізає розширення лише в оригінальному регістрі (`.PNG`).
  const rawExtension = path.extname(originalName);
  const extension = rawExtension.toLowerCase();
  const baseName = slugify(path.basename(originalName, rawExtension), {
    lower: true,
    strict: true,
  });
  const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${baseName || fallback}-${suffix}${extension}`;
}
