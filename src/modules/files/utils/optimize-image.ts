import sharp from 'sharp';
import { SniffedImage } from './sniff-image-type';

/** Довша сторона після завантаження: з запасом для retina при контенті ~1140px. */
export const MAX_IMAGE_SIDE = 2400;

const WEBP_QUALITY = 82;

// Запобіжник від «піксельної бомби»: 50 Мп із запасом покриває будь-яке фото.
const MAX_INPUT_PIXELS = 50_000_000;

// SVG — вектор, перекодовувати нема чого. GIF лишаємо як є навіть
// статичний: перекодування анімації — окрема історія.
const PASSTHROUGH_TYPES = new Set(['image/svg+xml', 'image/gif']);

export interface ProcessedImage extends SniffedImage {
  buffer: Buffer;
  width: number | null;
  height: number | null;
  /** true — байти відрізняються від завантажених (перекодовано/зменшено). */
  changed: boolean;
}

/**
 * Оптимізує растрове зображення при завантаженні: повертає EXIF-орієнтацію,
 * зменшує до {@link MAX_IMAGE_SIDE} і перекодовує у WebP — але лише якщо це
 * справді менше (AVIF, наприклад, зазвичай компактніший за WebP, тож лишається
 * оригіналом). Заодно визначає розміри. Помилка декодування не фатальна:
 * файл зберігається як є, без розмірів.
 */
export async function optimizeImage(
  original: Buffer,
  sniffed: SniffedImage,
): Promise<ProcessedImage> {
  const asIs = (width: number | null, height: number | null) => ({
    ...sniffed,
    buffer: original,
    width,
    height,
    changed: false,
  });

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(original, {
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata();
  } catch {
    return asIs(null, null);
  }

  // Орієнтації 5–8 — повернуті на 90°: у браузері ширина й висота міняються.
  const rotated = (metadata.orientation ?? 1) >= 5;
  const width = (rotated ? metadata.height : metadata.width) ?? null;
  const height = (rotated ? metadata.width : metadata.height) ?? null;

  // Анімовані WebP/APNG: sharp за замовчуванням читає лише перший кадр, і
  // «оптимізований» файл тихо ставав би статичною картинкою. APNG libvips
  // як анімацію не бачить (`pages` порожнє) — його впізнаємо за chunk-ом.
  const animated =
    (metadata.pages ?? 1) > 1 ||
    (sniffed.mimeType === 'image/png' && isApng(original));
  if (animated || PASSTHROUGH_TYPES.has(sniffed.mimeType)) {
    return asIs(width, height);
  }

  try {
    const { data, info } = await sharp(original, {
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .rotate()
      .resize({
        width: MAX_IMAGE_SIDE,
        height: MAX_IMAGE_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    const resized = Math.max(width ?? 0, height ?? 0) > MAX_IMAGE_SIDE;
    if (!resized && data.length >= original.length) {
      return asIs(width, height);
    }
    return {
      mimeType: 'image/webp',
      extension: '.webp',
      buffer: data,
      width: info.width,
      height: info.height,
      changed: true,
    };
  } catch {
    return asIs(width, height);
  }
}

/** APNG — це PNG з chunk-ом `acTL`, який мусить іти перед першим `IDAT`. */
export function isApng(png: Buffer): boolean {
  const actl = png.indexOf('acTL');
  const idat = png.indexOf('IDAT');
  return actl !== -1 && (idat === -1 || actl < idat);
}
