import sharp from 'sharp';

/**
 * Довша сторона, яку Anthropic радить не перевищувати: більше він однаково
 * зменшить сам, лише з довшою відповіддю і дорожчими токенами.
 */
const MAX_SIDE = 1568;

// Запобіжник від «піксельної бомби»: 50 Мп із запасом покриває будь-яке фото.
const MAX_INPUT_PIXELS = 50_000_000;

/**
 * Перетворює зображення медіатеки на JPEG, який приймають усі vision-
 * провайдери. Без цього більшість картинок сайту лишилася б без ШІ: вони
 * завантажені як AVIF (часто під `.jpeg`), а AVIF і SVG не бере жоден
 * провайдер. Заодно зменшує розмір (ліміт Anthropic — 5 МБ) і вартість.
 * Кидає, якщо байти не декодуються як зображення.
 */
export async function prepareAiImage(
  bytes: Buffer,
): Promise<{ data: Buffer; mediaType: 'image/jpeg' }> {
  const data = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS })
    // Фото з телефона лежать «боком» з EXIF-орієнтацією — модель має бачити як людина.
    .rotate()
    .resize({
      width: MAX_SIDE,
      height: MAX_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    // JPEG без альфа-каналу: прозорий фон (PNG/SVG-іконки) робимо білим, як на сайті.
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { data, mediaType: 'image/jpeg' };
}
