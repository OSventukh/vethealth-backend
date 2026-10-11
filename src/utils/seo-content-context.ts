/** Keep this module in sync in the independent frontend and backend apps. */
export interface SeoTextContext {
  text: string;
  sourceTruncated: boolean;
}

/** Lexical TextNode subclasses; decorators (image etc.) may carry `text` but are not prose. */
const TEXT_LEAF_TYPES = new Set([
  'text',
  'code-highlight',
  'hashtag',
  'keyword',
]);

/** Inline formatting must not insert spaces inside words. Only blocks separate text. */
export function lexicalText(value: unknown, structured = false): string {
  const walk = (node: unknown): string => {
    if (!node || typeof node !== 'object') return '';
    const record = node as Record<string, unknown>;
    if (record.root) return walk(record.root);
    if (record.type === 'linebreak') return '\n';
    if (record.type === 'tab') return '\t';
    if (
      (!record.type || TEXT_LEAF_TYPES.has(String(record.type))) &&
      typeof record.text === 'string'
    ) {
      return record.text;
    }
    if (!Array.isArray(record.children)) return '';
    const text = record.children.map(walk).join('');
    if (
      record.type === 'link' ||
      record.type === 'autolink' ||
      record.type === 'mark'
    ) {
      return text;
    }
    const heading = structured && record.type === 'heading' ? '## ' : '';
    return `${heading}${text}\n`;
  };
  const text = walk(value);
  return structured
    ? text
        .replace(/[ \t]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : text.replace(/\s+/g, ' ').trim();
}

/** Bounded excerpts across the document, with headings and a visible truncation marker. */
export function prepareSeoContext(
  text: string,
  maxChars = 12000,
): SeoTextContext {
  text = text.trim();
  if (text.length <= maxChars) return { text, sourceTruncated: false };
  const headings = text.split('\n').filter((line) => /^#{1,6}\s/.test(line));
  const outline = headings.length
    ? `Структура матеріалу:\n${headings.join('\n').slice(0, Math.floor(maxChars / 5))}\n\n`
    : '';
  const marker = '\n[… пропущено частину тексту …]\n';
  const sections = text.split(/(?=^#{1,6}\s)/m).filter((part) => part.trim());
  // Preserve excerpts of each normal-sized outline; exceptionally large outlines
  // are sampled evenly, always including the beginning and the end.
  const selected =
    sections.length > 16
      ? Array.from(
          { length: 16 },
          (_, i) => sections[Math.round((i * (sections.length - 1)) / 15)],
        )
      : sections;
  if (selected.length > 1) {
    const budget = Math.floor(
      (maxChars - outline.length - marker.length * (selected.length * 2 - 1)) /
        selected.length,
    );
    const excerpts = selected.map((section) =>
      section.length <= budget
        ? section
        : section.slice(0, Math.ceil(budget / 2)) +
          marker +
          section.slice(-Math.floor(budget / 2)),
    );
    return { text: outline + excerpts.join(marker), sourceTruncated: true };
  }
  const budget = maxChars - outline.length - marker.length * 2;
  const size = Math.floor(budget / 3);
  const middleStart = Math.floor((text.length - size) / 2);
  return {
    text:
      outline +
      text.slice(0, size) +
      marker +
      text.slice(middleStart, middleStart + size) +
      marker +
      text.slice(-size),
    sourceTruncated: true,
  };
}
