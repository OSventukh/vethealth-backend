import slugify from 'slugify';

export function stringToSlugTransform(string: string): string {
  return slugify(string, {
    locale: 'uk',
    lower: true,
    trim: true,
  });
}
