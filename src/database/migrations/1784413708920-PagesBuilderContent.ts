import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

type BuilderDocument = {
  version?: unknown;
  blocks?: { type?: string; data?: { content?: string } }[];
};

const tryParse = (content: string): BuilderDocument | null => {
  try {
    const parsed = JSON.parse(content);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
};

const isBuilderDocument = (content: string): boolean => {
  const parsed = tryParse(content);
  return parsed?.version === 1 && Array.isArray(parsed.blocks);
};

/**
 * Перехід на посторінковий конструктор блоків: `pages.content` тепер зберігає
 * документ `{version: 1, blocks: [...]}`. Наявний контент (Lexical editor-state)
 * загортається в єдиний блок `richtext` без втрати даних.
 */
export class PagesBuilderContent1784413708920 implements MigrationInterface {
  name = 'PagesBuilderContent1784413708920';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Документ конструктора додає обгортку до і без того великого Lexical JSON —
    // TEXT (64 КБ) стає тісним, MEDIUMTEXT прибирає ризик обрізання.
    await queryRunner.query(
      'ALTER TABLE `pages` MODIFY `content` MEDIUMTEXT NOT NULL',
    );

    const rows: { id: string; content: string }[] = await queryRunner.query(
      'SELECT `id`, `content` FROM `pages`',
    );
    for (const row of rows) {
      if (!row.content || isBuilderDocument(row.content)) {
        continue;
      }
      const document = {
        version: 1,
        blocks: [
          {
            id: randomUUID(),
            type: 'richtext',
            data: { content: row.content },
          },
        ],
      };
      await queryRunner.query('UPDATE `pages` SET `content` = ? WHERE `id` = ?', [
        JSON.stringify(document),
        row.id,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows: { id: string; content: string }[] = await queryRunner.query(
      'SELECT `id`, `content` FROM `pages`',
    );
    for (const row of rows) {
      const parsed = tryParse(row.content);
      const blocks = parsed?.version === 1 ? (parsed.blocks ?? []) : null;
      // Розгортаємо лише документи з одним richtext-блоком (результат up);
      // складніші документи конструктора в легасі-формат не конвертуються.
      if (blocks?.length === 1 && blocks[0]?.type === 'richtext') {
        await queryRunner.query(
          'UPDATE `pages` SET `content` = ? WHERE `id` = ?',
          [blocks[0].data?.content ?? '', row.id],
        );
      }
    }
    await queryRunner.query(
      'ALTER TABLE `pages` MODIFY `content` TEXT NOT NULL',
    );
  }
}
