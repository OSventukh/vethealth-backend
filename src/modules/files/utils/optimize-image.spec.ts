import sharp from 'sharp';
import { isApng, optimizeImage } from './optimize-image';
import { sniffImageType } from './sniff-image-type';

/**
 * «Фото»: градієнт із шумом. На рівному кольорі PNG вигравав би в будь-якого
 * кодека, на чистому шумі — програвали б lossy-кодеки; тут — як у житті.
 */
async function photo(width: number, height: number) {
  const pixels = Buffer.alloc(width * height * 3);
  let seed = 42;
  for (let i = 0; i < pixels.length; i++) {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    const x = Math.floor(i / 3) % width;
    const y = Math.floor(i / 3 / width);
    pixels[i] = Math.min(
      255,
      ((x + y * ((i % 3) + 1)) % 256) * 0.8 + (seed % 40),
    );
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } });
}

const run = (buffer: Buffer) => optimizeImage(buffer, sniffImageType(buffer));

describe('optimizeImage', () => {
  it('re-encodes a heavy PNG to a smaller WebP and reports its size', async () => {
    const png = await (await photo(300, 200)).png().toBuffer();

    const result = await run(png);

    expect(result).toMatchObject({
      mimeType: 'image/webp',
      extension: '.webp',
      width: 300,
      height: 200,
      changed: true,
    });
    expect(result.buffer.length).toBeLessThan(png.length);
  });

  it('shrinks images larger than 2400px', async () => {
    // Рівний колір: генерувати 4,5 Мп «фото» в JS задовго, а зменшення
    // спрацьовує незалежно від того, чи стиснувся файл.
    const big = await sharp({
      create: { width: 3000, height: 1500, channels: 3, background: '#3a7' },
    })
      .jpeg()
      .toBuffer();

    const result = await run(big);

    expect(result).toMatchObject({ width: 2400, height: 1200, changed: true });
    expect((await sharp(result.buffer).metadata()).width).toBe(2400);
  });

  it('keeps an already compact original (WebP would not be smaller)', async () => {
    const jpeg = await (await photo(300, 200)).jpeg({ quality: 10 }).toBuffer();

    const result = await run(jpeg);

    expect(result).toMatchObject({
      mimeType: 'image/jpeg',
      changed: false,
      width: 300,
      height: 200,
    });
    expect(result.buffer).toBe(jpeg);
  });

  it('passes SVG through untouched, with dimensions from its attributes', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"></svg>',
    );

    expect(await run(svg)).toMatchObject({
      mimeType: 'image/svg+xml',
      buffer: svg,
      width: 40,
      height: 20,
      changed: false,
    });
  });

  it('keeps animated images untouched (sharp would keep only frame one)', async () => {
    const frame = (background: string) =>
      sharp({ create: { width: 40, height: 40, channels: 3, background } })
        .png()
        .toBuffer();
    const animated = await sharp([await frame('#f00'), await frame('#00f')], {
      join: { animated: true },
    })
      .webp({ lossless: true })
      .toBuffer();

    const result = await run(animated);

    expect(result).toMatchObject({ changed: false, mimeType: 'image/webp' });
    expect(result.buffer).toBe(animated);
  });

  it('recognizes APNG by its acTL chunk', async () => {
    const png = await (await photo(40, 40)).png().toBuffer();
    // Вставляємо acTL одразу після IHDR (сигнатура 8 + IHDR 25 байтів).
    const actl = Buffer.concat([
      Buffer.from([0, 0, 0, 8]),
      Buffer.from('acTL'),
      Buffer.alloc(12),
    ]);
    const apng = Buffer.concat([png.subarray(0, 33), actl, png.subarray(33)]);

    expect(isApng(png)).toBe(false);
    expect(isApng(apng)).toBe(true);
    const result = await run(apng);
    expect(result.changed).toBe(false);
  });

  it('swaps width and height for EXIF-rotated photos', async () => {
    const rotated = await (
      await photo(40, 20)
    )
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const result = await run(rotated);

    expect([result.width, result.height]).toEqual([20, 40]);
  });

  it('keeps undecodable bytes as they are', async () => {
    const broken = Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    expect(await run(broken)).toMatchObject({
      buffer: broken,
      width: null,
      height: null,
      changed: false,
    });
  });
});
