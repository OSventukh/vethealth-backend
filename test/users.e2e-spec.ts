import { createTestModule } from './utils/test-module';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UsersModule } from '@/users/users.module';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { UpdateUserDto } from '@/users/dto/update-user.dto';
import { DataSource } from 'typeorm';
import { UsersService } from '@/users/users.service';
import { RoleEnum } from '@/roles/roles.enum';
import { RoleSeedService } from '@/database/seeds/role/role-seed.service';
import { UserStatusSeedService } from '@/database/seeds/status/user-status-seed.service';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let connection: DataSource;
  let usersService: UsersService;

  const user: CreateUserDto = {
    firstname: 'Test firstname',
    lastname: 'Test lastname',
    email: 'test@test.com',
    role: {
      id: RoleEnum.Writer,
    },
  } as CreateUserDto;

  beforeEach(async () => {
    const test = await createTestModule({
      imports: [UsersModule],
      providers: [IsValidColumn],
    });
    app = test.app;
    connection = test.connection;
    usersService = app.get<UsersService>(UsersService);
    await app.get(UserStatusSeedService).run();
    await app.get(RoleSeedService).run();
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

  it('/users (GET) should return a list of users', async () => {
    await usersService.create(user);
    await usersService.create({ ...user, email: 'test2@test.com' });
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .then((response) => {
        const { items, count } = response.body;
        expect(items.length).toBe(2);
        expect(count).toBe(2);
      });
  });

  it('/users/id (GET) should return a user with provided id, if it exist', async () => {
    await usersService.create(user);
    const user2 = await usersService.create({
      ...user,
      firstname: 'New Test User',
      email: 'test2@test.com',
    });
    return request(app.getHttpServer())
      .get(`/users/${user2.id}`)
      .expect(200)
      .then((response) => {
        const { firstname, email } = response.body;
        expect(firstname).toBe(user2.firstname);
        expect(email).toBe(user2.email);
      });
  });

  it('/users/id (GET) should return 404 status code, if user with provided id not found', () => {
    const userId = 'non-existen-user-id';
    return request(app.getHttpServer()).get(`/users/${userId}`).expect(404);
  });

  it('/users (PATCH) should update the user', async () => {
    const createdUser = await usersService.create(user);
    const payload: UpdateUserDto = {
      firstname: 'Updated firstname',
      id: 'testId',
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

    return request(app.getHttpServer())
      .delete(`/users/${createdUser.id}`)
      .expect(204)
      .then((response) => {
        expect(response.body).toEqual({});
      });
  });
});
