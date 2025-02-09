import * as path from 'path';

const UPLOADS = 'uploads';
const IMAGES = 'images';
const TOPICS = 'topics';
const POSTS = 'posts';
const FEATURED = 'featured';
const CONTENT = 'content';

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
} as const;
