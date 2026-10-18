import sharp from 'sharp';
import { prepareAiImage } from './prepare-ai-image';

const solid = (width: number, height: number) =>
  sharp({
    create: { width, height, channels: 4, background: '#cc3300' },
  });

describe('prepareAiImage', () => {
  it('converts AVIF — the format most site images are stored in — to JPEG', async () => {
    const avif = await solid(32, 16).avif().toBuffer();

    const { data, mediaType } = await prepareAiImage(avif);

    expect(mediaType).toBe('image/jpeg');
    expect(await sharp(data).metadata()).toMatchObject({
      format: 'jpeg',
      width: 32,
      height: 16,
    });
  });

  it('rasterizes SVG', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="red"/></svg>',
    );

    const { data } = await prepareAiImage(svg);

    expect((await sharp(data).metadata()).format).toBe('jpeg');
  });

  it('shrinks large images to the 1568px provider limit, keeping the ratio', async () => {
    const big = await solid(3200, 1600).png().toBuffer();

    const { data } = await prepareAiImage(big);

    expect(await sharp(data).metadata()).toMatchObject({
      width: 1568,
      height: 784,
    });
  });

  it('throws for bytes that are not an image', async () => {
    await expect(prepareAiImage(Buffer.from('not an image'))).rejects.toThrow();
  });
});
