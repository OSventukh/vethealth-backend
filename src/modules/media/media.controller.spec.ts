import { ROLES_KEY } from '@/roles/decorators/roles.decorator';
import { RoleEnum } from '@/roles/roles.enum';
import { MediaController } from './media.controller';

// `ai` і `@ai-sdk/*` — ESM-only: приїжджають транзитивно через AiService.
jest.mock('@ai-sdk/anthropic', () => ({ createAnthropic: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: jest.fn() }));
jest.mock('ai', () => ({
  generateObject: jest.fn(),
  createProviderRegistry: jest.fn(),
  APICallError: { isInstance: () => false },
  NoObjectGeneratedError: { isInstance: () => false },
  RetryError: { isInstance: () => false },
}));

const ADMINS = [RoleEnum.SuperAdmin, RoleEnum.Admin];
const rolesOf = (handler: keyof MediaController) =>
  Reflect.getMetadata(ROLES_KEY, MediaController.prototype[handler]);

describe('MediaController access', () => {
  it('lets any signed-in role browse and pick media', () => {
    expect(rolesOf('findMany')).toBeUndefined();
    expect(rolesOf('findOne')).toBeUndefined();
  });

  it('limits alt changes, paid AI generation and deletion to Admin+', () => {
    for (const handler of [
      'update',
      'generateAlt',
      'remove',
      'bulkRemove',
    ] as const) {
      expect(rolesOf(handler)).toEqual(ADMINS);
    }
  });
});
