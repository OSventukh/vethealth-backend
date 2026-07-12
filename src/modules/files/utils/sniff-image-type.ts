/**
 * Визначає реальний тип зображення за магічними байтами.
 *
 * Навіщо: multer бере mimetype з того, що заявив браузер, а браузер бере його
 * з розширення файлу. Файл AVIF, названий `.jpeg`, приїжджає як `image/jpeg`,
 * потрапляє в R2 з `ContentType: image/jpeg` — і Firefox блокує таку картинку
 * (OpaqueResponseBlocking), бо заявлений тип не збігається зі вмістом.
 * Тому тип беремо з байтів, а не зі слів клієнта.
 */
export type SniffedImage = {
  mimeType: string;
  extension: string;
};

const asciiAt = (buffer: Buffer, offset: number, length: number): string =>
  buffer.subarray(offset, offset + length).toString('ascii');

export function sniffImageType(buffer: Buffer): SniffedImage | null {
  if (buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    asciiAt(buffer, 1, 3) === 'PNG' &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: '.png' };
  }

  // GIF: "GIF87a" / "GIF89a"
  if (asciiAt(buffer, 0, 3) === 'GIF') {
    return { mimeType: 'image/gif', extension: '.gif' };
  }

  // RIFF-контейнер: "RIFF"…"WEBP"
  if (asciiAt(buffer, 0, 4) === 'RIFF' && asciiAt(buffer, 8, 4) === 'WEBP') {
    return { mimeType: 'image/webp', extension: '.webp' };
  }

  // ISO-BMFF (AVIF/HEIC): [size][ftyp][brand]
  if (asciiAt(buffer, 4, 4) === 'ftyp') {
    const brand = asciiAt(buffer, 8, 4);
    if (brand === 'avif' || brand === 'avis') {
      return { mimeType: 'image/avif', extension: '.avif' };
    }
    if (brand === 'heic' || brand === 'heix' || brand === 'mif1') {
      return { mimeType: 'image/heic', extension: '.heic' };
    }
  }

  // SVG — текстовий, тому без магічних байтів: шукаємо <svg у преамбулі
  // (може передувати XML-декларація або BOM).
  const head = buffer.subarray(0, 1024).toString('utf8').trimStart();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) {
    if (/<svg[\s>]/i.test(head)) {
      return { mimeType: 'image/svg+xml', extension: '.svg' };
    }
  }

  return null;
}
