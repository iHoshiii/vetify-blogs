export const SLUG_MAX_LENGTH = 80;

export const SLUG_FALLBACK = 'post';

export function slugify(input: string): string {
  const slug = input
    .normalize('NFKD') // splits é into e + a combining accent
    .replace(/[\u0300-\u036f]/g, '') // …which this then drops
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');

  return slug || SLUG_FALLBACK;
}
