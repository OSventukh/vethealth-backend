import { lexicalText, prepareSeoContext } from './seo-content-context';

describe('SEO source context', () => {
  it('joins inline formatting and links without corrupting words, and separates blocks', () => {
    const root = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'вет' },
              { type: 'link', children: [{ type: 'text', text: 'еринар' }] },
              { type: 'text', text: ' радить' },
            ],
          },
          {
            type: 'heading',
            children: [{ type: 'text', text: 'Профілактика' }],
          },
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'Догляд' },
              { type: 'linebreak' },
              { type: 'text', text: 'за тваринами.' },
            ],
          },
        ],
      },
    };
    expect(lexicalText(root)).toBe(
      'ветеринар радить Профілактика Догляд за тваринами.',
    );
    expect(lexicalText(root, true)).toContain('\n## Профілактика\n');
  });
  it('keeps non-text leaves such as code, hashtags and tabs', () => {
    const root = {
      root: {
        type: 'root',
        children: [
          {
            type: 'code',
            children: [
              { type: 'code-highlight', text: 'const' },
              { type: 'tab' },
              { type: 'code-highlight', text: 'dose' },
            ],
          },
          {
            type: 'paragraph',
            children: [{ type: 'hashtag', text: '#кліщі' }],
          },
        ],
      },
    };
    expect(lexicalText(root)).toBe('const dose #кліщі');
  });
  it('preserves short source text completely', () => {
    expect(prepareSeoContext('Вступ\n## Розділ\nТекст')).toEqual({
      text: 'Вступ\n## Розділ\nТекст',
      sourceTruncated: false,
    });
  });
  it('keeps excerpts from all main sections and final cautions within the budget', () => {
    const text = ['Огляд', 'Ознаки', 'Діагностика', 'Обмеження']
      .map(
        (heading, i) =>
          `## ${heading}\nПочаток ${i} ${'а'.repeat(10000)} Кінець ${i}`,
      )
      .join('\n');
    const context = prepareSeoContext(text);
    expect(context.sourceTruncated).toBe(true);
    expect(context.text.length).toBeLessThanOrEqual(12000);
    for (let i = 0; i < 4; i++) {
      expect(context.text).toContain(`Початок ${i}`);
      expect(context.text).toContain(`Кінець ${i}`);
    }
  });
  it('samples an unstructured source at the beginning, middle and end', () => {
    const text = `ВСТУП${'а'.repeat(10000)}СЕРЕДИНА${'б'.repeat(10000)}ЗАСТЕРЕЖЕННЯ`;
    const context = prepareSeoContext(text);
    expect(context.text.length).toBeLessThanOrEqual(12000);
    for (const label of ['ВСТУП', 'СЕРЕДИНА', 'ЗАСТЕРЕЖЕННЯ'])
      expect(context.text).toContain(label);
  });
});
