import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app';

import { login, logout, refreshTokens } from '../../services/auth.services.js';
import { verifyRefreshToken } from '../../utils/token';
import auth from '../../middlewares/auth';

describe('Auth controllers', () => {
  beforeEach(() => {
    vi.mock('../../services/auth.services.js');
    vi.mock('../../utils/token');
    vi.mock('../../middlewares/auth');
    auth.mockImplementationOnce((req, res, next) => next());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe('loginController', () => {
    it('Should return accessToken and userId in response object', async () => {
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
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body.accessToken).toBe(loginBody.accessToken);
      expect(response.body.userId).toBe(loginBody.userId);
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

    it('Should not return refreshToken in response object', async () => {
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
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body.refreshToken).not.toBe(loginBody.refreshToken);
    });

    it('Should return refreshToken in cookies with HttpOnly option', async () => {
      const userCredentials = {
        email: 'test@test.com',
        password: '123456',
      };
      const loginBody = {
        accessToken: '1234',
        refreshToken: '12345',
        userId: '1',
      };

      login.mockResolvedValueOnce(loginBody);
      const response = await request(app).post('/login').send(userCredentials);
      expect(response.headers['set-cookie'][0]).toContain(`refreshToken=${loginBody.refreshToken}`);
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    });

    it('Should return an error with message "User already authenticated" and status code 409 if valid refresh token provided', async () => {
      const userCredentials = {
        email: 'test@test.com',
        password: '123456',
      };
      const loginBody = {
        accessToken: '1234',
        refreshToken: '12345',
        userId: '1',
      };
      verifyRefreshToken.mockResolvedValueOnce(true);
      login.mockResolvedValueOnce(loginBody);
      const response = await request(app).post('/login').set('Cookie', ['refreshToken=1234567']).send(userCredentials);
      expect(response.statusCode).toBe(409);
      expect(response.text).toContain('User already authenticated');
    });
  });

  describe('refreshTokenController', () => {
    it('Should return new accessToken in response object if valid refresh provided by cookies', async () => {
      const refreshBody = {
        newAccessToken: '1234',
        newRefreshToken: '123456',
      };

      refreshTokens.mockResolvedValueOnce(refreshBody);
      const response = await request(app).get('/login/refreshtoken').set('Cookie', ['refreshToken=1234567']);
      expect(response.body).haveOwnProperty('accessToken');
      expect(response.body.accessToken).toBe(refreshBody.newAccessToken);
    });

    it('Should not return new refreshToken in response object', async () => {
      const refreshBody = {
        newAccessToken: '1234',
        newRefreshToken: '123456',
      };

      refreshTokens.mockResolvedValueOnce(refreshBody);
      const response = await request(app).get('/login/refreshtoken').set('Cookie', ['refreshToken=1234567']);
      expect(response.body).not.haveOwnProperty('refreshToken');
    });

    it('Should return new refreshToken in cookies if old refreshToken was valid', async () => {
      const refreshBody = {
        newAccessToken: '1234',
        newRefreshToken: '123456',
      };

      refreshTokens.mockResolvedValueOnce(refreshBody);
      const response = await request(app).get('/login/refreshtoken').set('Cookie', ['refreshToken=1234567']);
      expect(response.headers['set-cookie'][0]).toContain(`refreshToken=${refreshBody.newRefreshToken}`);
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    });

    it('Should response an error with message "Not Authenticated" and status code 401 if refreshToken not provided', async () => {
      const response = await request(app).get('/login/refreshtoken');
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Not Authenticated');
    });

    it('Should response an error with message "Not Authenticated" and status code 401 if refreshToken not valid', async () => {
      const response = await request(app).get('/login/refreshtoken').set('Cookie', ['refreshToken=1234567']);
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
