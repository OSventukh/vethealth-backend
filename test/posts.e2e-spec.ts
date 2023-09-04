import { createTestModule } from './utils/test-module';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PostsModule } from '@/posts/posts.module';
import { UsersModule } from '@/users/users.module';
import { DataSource } from 'typeorm';
import { CreatePostDto } from '@/posts/dto/create-post.dto';
import { UpdatePostDto } from '@/posts/dto/update-post.dto';
import { PostsService } from '@/posts/posts.service';
import { UsersService } from '@/users/users.service';
import { PostStatusEnum } from '@/posts/post-status.enum';

describe('PostsController (e2e)', () => {
  let app: INestApplication;
  let connection: DataSource;
  let postsService: PostsService;
  let usersService: UsersService;

  const post: CreatePostDto = {
    title: 'Test title',
    content: 'Test content',
    excerpt: 'Test excerpt',
    slug: 'test-slug',
    status: PostStatusEnum.Draft,
  };

  beforeEach(async () => {
    const test = await createTestModule({
      imports: [PostsModule, UsersModule],
    });
    app = test.app;
    connection = test.connection;
    postsService = app.get<PostsService>(PostsService);
    usersService = app.get<UsersService>(UsersService);
    await app.init();
  });

  afterEach(async () => {
    await connection.dropDatabase();
    await app.close();
  });

  it('/posts (POST) should create and return a new post', () => {
    return request(app.getHttpServer())
      .post('/posts')
      .send(post)
      .expect(201)
      .then((response) => {
        const createdPost = response.body;
        expect(createdPost.title).toBe(post.title);
        expect(createdPost.content).toBe(post.content);
      });
  });

  it('/posts (GET) should return a list of posts', async () => {
    await postsService.create(post);
    await postsService.create({
      ...post,
      title: 'Test title 2',
      slug: 'test-slug-2',
    });
    return request(app.getHttpServer())
      .get('/posts')
      .expect(200)
      .then((response) => {
        const { items, count } = response.body;
        expect(items.length).toBe(2);
        expect(count).toBe(2);
      });
  });

  it('/post/id (GET) should return a post with provided id, if it exist', async () => {
    await postsService.create(post);
    const post2 = await postsService.create({
      ...post,
      title: 'Test title 2',
      slug: 'test-slug-2',
    });
    return request(app.getHttpServer())
      .get(`/posts/${post2.id}`)
      .expect(200)
      .then((response) => {
        const { title } = response.body;
        expect(title).toBe(post2.title);
      });
  });

  it('/post/id (GET) should return 404 status code, if post not exist', async () => {
    const postId = 'non-existen-post-id';
    return request(app.getHttpServer()).get(`/posts/${postId}`).expect(404);
  });

  it('/posts (PATCH) should update the post', async () => {
    const createdPost = await postsService.create(post);
    const payload: UpdatePostDto = {
      title: 'Updated Title',
    };
    return request(app.getHttpServer())
      .patch(`/posts/${createdPost.id}`)
      .send(payload)
      .expect(200)
      .then((response) => {
        const { title } = response.body;
        expect(title).toBe(payload.title);
      });
  });

  it('/posts (DELETE) should delete the post', async () => {
    const createdPost = await postsService.create(post);
    return request(app.getHttpServer())
      .delete(`/posts/${createdPost.id}`)
      .expect(204)
      .then((response) => {
        expect(response.body).toEqual({});
      });
  });
});
