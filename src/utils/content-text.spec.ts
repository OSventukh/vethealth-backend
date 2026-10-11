import {
  extractLexicalText,
  lexicalContentText,
  pageBlocksText,
} from './content-text';

const lexical = (...texts: string[]) =>
  JSON.stringify({
    root: {
      children: texts.map((text) => ({
        type: 'paragraph',
        children: [{ type: 'text', text }],
      })),
    },
  });

describe('content-text', () => {
  it('collects visible Lexical text and collapses whitespace', () => {
    expect(lexicalContentText(lexical('Перший  абзац', ' Другий\n'))).toBe(
      'Перший абзац Другий',
    );
  });

  it('ignores non-text nodes', () => {
    expect(
      extractLexicalText({
        root: { children: [{ type: 'image', text: 'alt', src: 'x.png' }] },
      }),
    ).toBe('');
  });

  it.each([null, undefined, '', 'не json'])(
    'returns empty text for %p content',
    (content) => {
      expect(lexicalContentText(content)).toBe('');
      expect(pageBlocksText(content)).toBe('');
    },
  );

  it('collects block strings, unwraps richtext and skips URL-like keys', () => {
    const content = JSON.stringify({
      version: 1,
      blocks: [
        { id: '1', type: 'hero', data: { title: 'Герой', imageUrl: 'a.png' } },
        { id: '2', type: 'richtext', data: { content: lexical('Тіло') } },
        {
          id: '3',
          type: 'cards',
          data: { items: [{ title: 'Картка', href: '/x' }] },
        },
      ],
    });

    expect(pageBlocksText(content)).toBe('Герой Тіло Картка');
  });

  it('falls back to Lexical for legacy page content', () => {
    expect(pageBlocksText(lexical('Стара сторінка'))).toBe('Стара сторінка');
  });
});
