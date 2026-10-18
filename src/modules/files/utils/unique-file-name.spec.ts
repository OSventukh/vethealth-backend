import { uniqueFileName } from './unique-file-name';

describe('uniqueFileName', () => {
  it('keeps a readable slug and adds a unique suffix', () => {
    const first = uniqueFileName('Dog Photo.PNG', 'topic');
    const second = uniqueFileName('Dog Photo.PNG', 'topic');

    expect(first).toMatch(/^dog-photo-\d+-\d+\.png$/);
    expect(first).not.toBe(second);
  });

  it('falls back to the field name when the slug is empty', () => {
    expect(uniqueFileName('###.jpg', 'topic')).toMatch(/^topic-\d+-\d+\.jpg$/);
  });
});
