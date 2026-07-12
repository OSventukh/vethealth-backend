import { sniffImageType } from './sniff-image-type';

const pad = (bytes: number[], length = 32): Buffer => {
  const buffer = Buffer.alloc(length);
  Buffer.from(bytes).copy(buffer);
  return buffer;
};

const ascii = (text: string): number[] => [...Buffer.from(text, 'ascii')];

describe('sniffImageType', () => {
  it('розпізнає JPEG за FF D8 FF', () => {
    expect(sniffImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toEqual({
      mimeType: 'image/jpeg',
      extension: '.jpg',
    });
  });

  it('розпізнає PNG', () => {
    expect(
      sniffImageType(pad([0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toEqual({ mimeType: 'image/png', extension: '.png' });
  });

  it('розпізнає GIF', () => {
    expect(sniffImageType(pad(ascii('GIF89a')))).toEqual({
      mimeType: 'image/gif',
      extension: '.gif',
    });
  });

  it('розпізнає WebP (RIFF….WEBP)', () => {
    expect(
      sniffImageType(pad([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')])),
    ).toEqual({ mimeType: 'image/webp', extension: '.webp' });
  });

  it('розпізнає AVIF, навіть якщо файл названо .jpeg (кейс ORB-блокування)', () => {
    // ISO-BMFF: [4 байти розміру]["ftyp"]["avif"]
    expect(
      sniffImageType(pad([0, 0, 0, 0x20, ...ascii('ftyp'), ...ascii('avif')])),
    ).toEqual({ mimeType: 'image/avif', extension: '.avif' });
  });

  it('розпізнає HEIC', () => {
    expect(
      sniffImageType(pad([0, 0, 0, 0x20, ...ascii('ftyp'), ...ascii('heic')])),
    ).toEqual({ mimeType: 'image/heic', extension: '.heic' });
  });

  it('розпізнає SVG з XML-декларацією та без неї', () => {
    expect(sniffImageType(Buffer.from('<svg xmlns="…"></svg>'))).toEqual({
      mimeType: 'image/svg+xml',
      extension: '.svg',
    });
    expect(
      sniffImageType(Buffer.from('<?xml version="1.0"?><svg xmlns="…"></svg>')),
    ).toEqual({ mimeType: 'image/svg+xml', extension: '.svg' });
  });

  it('повертає null для невідомого вмісту та закоротких буферів', () => {
    expect(sniffImageType(pad(ascii('not-an-image-at-all')))).toBeNull();
    expect(sniffImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
