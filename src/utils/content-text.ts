import { lexicalText } from './seo-content-context';

// Plain-text із контенту для пошуку і ШІ-промтів. Лишається синхронним із
// фронтендовим `src/lib/content-text.ts`: той самий обхід Lexical і ті самі
// правила для документів конструктора сторінок.

/** Ключі з URL/файлами — не текст. */
const URLISH_KEYS = /url|href|image|photo|src/i;

/** Видимий текст розпарсеного Lexical editor-state (текстові вузли). */
export function extractLexicalText(json: unknown): string {
  return lexicalText(json);
}

/** Текст поста: рядок із Lexical-JSON; не-JSON контент — порожньо. */
export function lexicalContentText(
  content: string | null | undefined,
  structured = false,
): string {
  const parsed = parseJson(content);
  return parsed === undefined ? '' : lexicalText(parsed, structured);
}

/**
 * Текст сторінки-документа конструктора `{version, blocks}`: рекурсивно
 * збирає рядкові поля блоків (нові типи блоків працюють без правок тут),
 * пропускає URL-подібні ключі і розпаковує Lexical у полях `content`.
 */
export function pageBlocksText(
  content: string | null | undefined,
  structured = false,
): string {
  const parsed = parseJson(content) as { blocks?: unknown } | undefined;
  if (!Array.isArray(parsed?.blocks)) {
    return parsed === undefined ? '' : lexicalText(parsed, structured);
  }
  const chunks: string[] = [];

  const collect = (value: unknown, key?: string) => {
    if (typeof value === 'string') {
      if (key && URLISH_KEYS.test(key)) {
        return;
      }
      chunks.push(
        key === 'content' ? lexicalContentText(value, structured) : value,
      );
    } else if (Array.isArray(value)) {
      value.forEach((item) => collect(item));
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([childKey, child]) =>
        collect(child, childKey),
      );
    }
  };

  for (const block of parsed.blocks as { data?: unknown }[]) {
    collect(block?.data);
  }
  return structured ? chunks.filter(Boolean).join('\n\n') : normalize(chunks);
}

function parseJson(content: string | null | undefined): unknown {
  if (!content) {
    return undefined;
  }
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

function normalize(chunks: string[]): string {
  return chunks
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ');
}
