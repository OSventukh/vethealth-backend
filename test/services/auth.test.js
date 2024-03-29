import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterEach,
  beforeEach,
} from 'vitest';
import {
  sequelize,
  User,
  UserToken,
  UserBlockedToken,
} from '../../models/index.js';

describe('auth services', () => {
  let login;
  let refreshTokens;
  let logout;
  let isUserLoggedIn;
  beforeAll(async () => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
    await User.sync({ force: true, logging: false });
    await Promise.all([
      UserToken.sync({ force: true }),
      UserBlockedToken.sync({ force: true }),
    ]);
    // import services after sequelize run
    const authServices = await import('../../services/auth.services.js');
    login = authServices.login;
    refreshTokens = authServices.refreshTokens;
    logout = authServices.logout;
    isUserLoggedIn = authServices.isUserLoggedIn;
  });
  beforeEach(() => {
    vi.stubEnv('ACCESS_TOKEN_SECRET_KEY', '12345');
    vi.stubEnv('REFRESH_TOKEN_SECRET_KEY', '12345');
  });
  afterEach(async () => {
    await User.destroy({ where: {}, force: true });
    await UserToken.destroy({ where: {}, force: true });
    await UserBlockedToken.destroy({ where: {}, force: true });
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('Should return an object with user, accessToken and refreshToken properties', async () => {
      const userCredentials = {
        firstname: 'Test',
        email: 'test@test.com',
        password: '12345',
      };
      await User.create({
        firstname: userCredentials.firstname,
        email: userCredentials.email,
        password: userCredentials.password,
      });
      const loginData = await login(
        userCredentials.email,
        userCredentials.password,
      );
      expect(loginData).haveOwnProperty('user');
      expect(loginData).haveOwnProperty('accessToken');
      expect(loginData).haveOwnProperty('refreshToken');
    });

    it('Should throw an error with message "Invalid email or password" and status code 401 if entered email not match', async () => {
      const userCredentials = {
        firstname: 'Test',
        email: 'test@test.com',
        password: '12345',
      };
      await User.create({
        firstname: userCredentials.firstname,
        email: userCredentials.email,
        password: userCredentials.password,
      });
      vi.stubEnv('ACCESS_TOKEN_SECRET_KEY', '12345');
      vi.stubEnv('REFRESH_TOKEN_SECRET_KEY', '12345');

      try {
        await login('test2@test.com', userCredentials.password);
      } catch (error) {
        expect(error.message).toBe('Invalid email or password');
        expect(error.statusCode).toBe(403);
      }
    });

    it('Should throw an error with message "Invalid email or password" and status code 401 if entered password not match', async () => {
      const userCredentials = {
        firstname: 'Test',
        email: 'test@test.com',
        password: '12345',
      };
      await User.create({
        firstname: userCredentials.firstname,
        email: userCredentials.email,
        password: userCredentials.password,
      });
      vi.stubEnv('ACCESS_TOKEN_SECRET_KEY', '12345');
      vi.stubEnv('REFRESH_TOKEN_SECRET_KEY', '12345');

      try {
        await login(userCredentials.email, '123');
      } catch (error) {
        expect(error.message).toBe('Invalid email or password');
        expect(error.statusCode).toBe(403);
      }
    });
  });

  describe('refreshTokens', () => {
    it('Should return object with newAccessToken and newRefreshToken if valid refreshtoken provided', async () => {
      const userCredentials = {
        firstname: 'Test',
        email: 'test@test.com',
        password: '12345',
      };
      await User.create({
        firstname: userCredentials.firstname,
        email: userCredentials.email,
        password: userCredentials.password,
      });
      const { refreshToken } = await login(
        userCredentials.email,
        userCredentials.password,
      );

      const result = await refreshTokens(refreshToken);

      expect(result).haveOwnProperty('newRefreshToken');
      expect(result).haveOwnProperty('newAccessToken');
    });

    it('Should check if valid refreshToken saved in database', async () => {
      const userCredentials = {
        firstname: 'Test',
        email: 'test@test.com',
        password: '12345',
      };

      await User.create({
        firstname: userCredentials.firstname,
        email: userCredentials.email,
        password: userCredentials.password,
      });

      const { refreshToken } = await login(
        userCredentials.email,
        userCredentials.password,
      );

      vi.spyOn(UserToken, 'findOne');

      await refreshTokens(refreshToken);
      expect(UserToken.findOne).toHaveBeenCalled();
    });

    it('Should check if exist user with provided refreshToken', async () => {
      const userCredentials = {
        firstname: 'Test',
        email: 'test@test.com',
        password: '12345',
      };
      await User.create({
        firstname: userCredentials.firstname,
        email: userCredentials.email,
        password: userCredentials.password,
      });
      const { refreshToken } = await login(
        userCredentials.email,
        userCredentials.password,
      );

      vi.spyOn(User, 'findByPk');

      await refreshTokens(refreshToken);
      expect(User.findByPk).toHaveBeenCalled();
    });

    it('Should throw an error with message "Not Authenticated" and status code 401 if refreshToken not find in database', async () => {
      const userCredentials = {
        firstname: 'Test',
        email: 'test@test.com',
        password: '12345',
      };

      await User.create({
        firstname: userCredentials.firstname,
        email: userCredentials.email,
        password: userCredentials.password,
      });

      const { refreshToken } = await login(
        userCredentials.email,
        userCredentials.password,
      );

      UserToken.findOne.mockResolvedValueOnce(1);
      try {
        await refreshTokens(refreshToken);
      } catch (error) {
        expect(error.message).toBe('Not Authenticated');
        expect(error.statusCode).toBe(401);
      }
    });

    it('Should throw an error with message "Not Authenticated" and status code 401 if refreshToken return userId that not registered', async () => {
      const userCredentials = {
        firstname: 'Test',
        email: 'test@test.com',
        password: '12345',
      };
      await User.create({
        firstname: userCredentials.firstname,
        email: userCredentials.email,
        password: userCredentials.password,
      });
      const { refreshToken } = await login(
        userCredentials.email,
        userCredentials.password,
      );

      User.findByPk.mockResolvedValueOnce(null);
      try {
        await refreshTokens(refreshToken);
      } catch (error) {
        expect(error.message).toBe('Not Authenticated');
        expect(error.statusCode).toBe(401);
      }
    });

    it('Should delete provided refreshToken from database', async () => {
      const userCredentials = {
        firstname: 'Test',
        email: 'test@test.com',
        password: '12345',
      };
      await User.create({
        firstname: userCredentials.firstname,
        email: userCredentials.email,
        password: userCredentials.password,
      });
      const { refreshToken } = await login(
        userCredentials.email,
        userCredentials.password,
      );

      await refreshTokens(refreshToken);

      const oldToken = await UserToken.findOne({
        where: {
          token: refreshToken,
        },
      });

      expect(oldToken).toBeNull();
    });
  });

  describe('isUserLoggedIn', () => {
    it('Should return true if provided valid accessToken', async () => {
      const userCredentials = {
        firstname: 'Test',
        email: 'test@test.com',
        password: '12345',
      };
      await User.create({
        firstname: userCredentials.firstname,
        email: userCredentials.email,
        password: userCredentials.password,
      });
      const { accessToken } = await login(
        userCredentials.email,
        userCredentials.password,
      );

      const result = await isUserLoggedIn(accessToken);
      expect(result).toBe(true);
    });

    it('Should return false if provided refreshToken not valid', async () => {
      const userCredentials = {
        firstname: 'Test',
        email: 'test@test.com',
        password: '12345',
      };
      await User.create({
        firstname: userCredentials.firstname,
        email: userCredentials.email,
        password: userCredentials.password,
      });
      await login(
        userCredentials.email,
        userCredentials.password,
      );

      const result = await isUserLoggedIn('123456');
      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('Should destroy provided refreshToken from database', async () => {
      const refreshToken = 12345;
      const accessToken = 1234;

      vi.spyOn(UserToken, 'destroy');

      await logout(refreshToken, accessToken);

      expect(UserToken.destroy).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
    });

    it('Should add provided accessToken to blacklist', async () => {
      const refreshToken = 12345;
      const accessToken = 1234;

      vi.spyOn(UserBlockedToken, 'create');

      await logout(refreshToken, accessToken);

      expect(UserBlockedToken.create).toHaveBeenCalled();
    });
    it('Should throw an HttpError if sequelize failed', async () => {
      const refreshToken = 12345;
      const accessToken = 1234;

      UserBlockedToken.create.mockRejectedValueOnce(new Error());
      expect.assertions(1);
      try {
        await logout(refreshToken, accessToken);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
