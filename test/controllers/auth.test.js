import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

import { isUserLoggedIn, login, logout, refreshTokens } from '../../services/auth.services.js';

describe('Auth controllers', () => {
  beforeEach(() => {
    vi.mock('../../services/auth.services.js');
    vi.mock('../../utils/token');
    vi.mock('../../middlewares/auth.js', () => ({
      default: vi.fn(),
      auth: (req, res, next) => {
        req.authUser = {
          id: 1,
          firstname: 'Test',
        };
        next();
      },
      rolesAccess: () => (req, res, next) => next(),
      canEditPost: (req, res, next) => next(),
    }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe('loginController', () => {
    it('Should return accessToken, refreshToken and userData in response object', async () => {
      const userCredentials = {
        email: 'test@test.com',
        password: '123456',
      };
      const loginBody = {
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
        user: {
          id: 1,
          role: 'test',
          email: 'test@test.com',
        },
      };

      login.mockResolvedValueOnce(loginBody);
      const response = await request(app).post('/login').send(userCredentials);

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body.accessToken.token).toBe(loginBody.accessToken);
      expect(response.body.refreshToken.token).toBe(loginBody.refreshToken);
      expect(response.body.user).toEqual(loginBody.user);
    });

    it('Should response with status code 200 if login was successfull', async () => {
      const userCredentials = {
        email: 'test@test.com',
        password: '123456',
      };
      const loginBody = {
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
        userId: '1',
      };

      login.mockResolvedValueOnce(loginBody);
      const response = await request(app).post('/login').send(userCredentials);
      expect(response.statusCode).toBe(200);
    });

    it('Should return an error with message "User already authenticated" and status code 409 if valid access token provided', async () => {
      const userCredentials = {
        email: 'test@test.com',
        password: '123456',
      };
      const loginBody = {
        accessToken: '1234',
        refreshToken: '12345',
        userId: '1',
      };
      isUserLoggedIn.mockResolvedValueOnce(true);
      login.mockResolvedValueOnce(loginBody);
      const response = await request(app).post('/login').set('Cookie', ['refreshToken=1234567']).send(userCredentials);

      expect(response.statusCode).toBe(409);
      expect(response.text).toContain('User already authenticated');
    });
  });

  describe('refreshTokenController', () => {
    it('Should return new accessToken and refreshToken in response object if valid refresh provided by header', async () => {
      const refreshBody = {
        newAccessToken: '1234',
        newRefreshToken: '123456',
      };

      refreshTokens.mockResolvedValueOnce(refreshBody);
      const response = await request(app).get('/login/refreshtoken').set('authorization', ['Bearer 1234567']);

      expect(response.body).haveOwnProperty('accessToken');
      expect(response.body).haveOwnProperty('refreshToken');
      expect(response.body.accessToken.token).toBe(refreshBody.newAccessToken);
      expect(response.body.refreshToken.token).toBe(refreshBody.newRefreshToken);
    });

    it('Should response with status code 204 and no content if refreshToken not provided', async () => {
      const response = await request(app).get('/login/refreshtoken');
      expect(response.statusCode).toBe(204);
      expect(response.body).toEqual({});
    });

    it('Should response an error with message "Not Authenticated" and status code 401 if refreshToken not valid', async () => {
      const response = await request(app).get('/login/refreshtoken').set('authorization', ['Bearer 1234567']);
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Not Authenticated');
    });
  });

  describe('logoutController', () => {
    it('Should response with status code 200 if logout successfully', async () => {
      logout.mockResolvedValueOnce(true);
      const response = await request(app).post('/logout').set('Authorization', 'Bearer 12345');
      expect(response.statusCode).toBe(200);
    });

    it('Should clear refreshToken from cookie', async () => {
      logout.mockResolvedValueOnce(true);
      const response = await request(app).post('/logout').set('Authorization', 'Bearer 12345').set('refreshToken', '12345');
      expect(response.headers['set-cookie'][0]).toContain('refreshToken=;');
    });
  });
});
