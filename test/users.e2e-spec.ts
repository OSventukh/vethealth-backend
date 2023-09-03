import { createTestModule } from './utils/test-module';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UsersModule } from '@/users/users.module';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { UpdateUserDto } from '@/users/dto/update-user.dto';
import { DataSource } from 'typeorm';
import { UsersService } from '@/users/users.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let connection: DataSource;
  let usersService: UsersService;

  const user: CreateUserDto = {
    firstname: 'Test firstname',
    lastname: 'Test lastname',
    email: 'test@test.com',
  };

  beforeEach(async () => {
    const test = await createTestModule({
      imports: [UsersModule],
    });
    app = test.app;
    connection = test.connection;
    usersService = app.get<UsersService>(UsersService);
    await app.init();
  });

  afterEach(async () => {
    await connection.dropDatabase();
    await app.close();
  });

  it('/users (POST) should create and return a new user', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send(user)
      .expect(201)
      .then((response) => {
        const createdUser = response.body;
        expect(createdUser.firstname).toBe(user.firstname);
      });
  });

  it('/users (GET) should returns a list of users', () => {
    return request(app.getHttpServer()).get('/users').expect(200);
  });

  it('/users (PATCH) should update the user', async () => {
    const createdUser = await usersService.create(user);
    const payload: UpdateUserDto = {
      firstname: 'Updated firstname',
    };

    return request(app.getHttpServer())
      .patch(`/users/${createdUser.id}`)
      .send(payload)
      .expect(200)
      .then((response) => {
        const { firstname } = response.body;
        expect(firstname).toBe(payload.firstname);
      });
  });

  it('/users (Delete) should delete the user', async () => {
    const createdUser = await usersService.create(user);
    const payload: UpdateUserDto = {
      firstname: 'Updated firstname',
    };

    return request(app.getHttpServer())
      .delete(`/users/${createdUser.id}`)
      .send(payload)
      .expect(204)
      .then((response) => {
        expect(response.body).toEqual({});
      });
  });
});
