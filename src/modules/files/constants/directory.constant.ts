import * as path from 'node:path';

const UPLOADS = 'uploads';
const IMAGES = 'images';
const TOPICS = 'topics';
const POSTS = 'posts';
const FEATURED = 'featured';
const CONTENT = 'content';
const MEDIA = 'media';

export const directories = {
  topic: path.join(UPLOADS, IMAGES, TOPICS),
  post: path.join(
    UPLOADS,
    IMAGES,
    POSTS,
    CONTENT,
    new Date().toISOString().slice(0, 10),
  ),
  'post-featured': path.join(UPLOADS, IMAGES, POSTS, FEATURED),
  media: path.join(
    UPLOADS,
    IMAGES,
    MEDIA,
    new Date().toISOString().slice(0, 10),
  ),
} as const;
