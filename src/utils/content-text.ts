// Plain-text із контенту для пошуку і ШІ-промтів. Лишається синхронним із
// фронтендовим `src/lib/content-text.ts`: той самий обхід Lexical і ті самі
// правила для документів конструктора сторінок.

/** Ключі з URL/файлами — не текст. */
const URLISH_KEYS = /url|href|image|photo|src/i;

/** Видимий текст розпарсеного Lexical editor-state (текстові вузли). */
export function extractLexicalText(json: unknown): string {
  const chunks: string[] = [];

  const traverse = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(traverse);
    } else if (typeof node === 'object' && node !== null) {
      const record = node as Record<string, unknown>;
      if (record.type === 'text' && typeof record.text === 'string') {
        chunks.push(record.text);
      }
      Object.values(record).forEach(traverse);
    }
  };

  traverse(json);
  return normalize(chunks);
}

/** Текст поста: рядок із Lexical-JSON; не-JSON контент — порожньо. */
export function lexicalContentText(content: string | null | undefined): string {
  const parsed = parseJson(content);
  return parsed === undefined ? '' : extractLexicalText(parsed);
}

/**
 * Текст сторінки-документа конструктора `{version, blocks}`: рекурсивно
 * збирає рядкові поля блоків (нові типи блоків працюють без правок тут),
 * пропускає URL-подібні ключі і розпаковує Lexical у полях `content`.
 */
export function pageBlocksText(content: string | null | undefined): string {
  const parsed = parseJson(content) as { blocks?: unknown } | undefined;
  if (!Array.isArray(parsed?.blocks)) {
    return parsed === undefined ? '' : extractLexicalText(parsed);
  }
  const chunks: string[] = [];

  const collect = (value: unknown, key?: string) => {
    if (typeof value === 'string') {
      if (key && URLISH_KEYS.test(key)) {
        return;
      }
      chunks.push(key === 'content' ? lexicalContentText(value) : value);
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
  return normalize(chunks);
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
