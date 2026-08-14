export const locales = ['ru', 'en', 'ky'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ru';

import ru from './ru.json';
import en from './en.json';
import ky from './ky.json';

export type Dictionary = typeof ru;

export function getDictionary(locale: string): Dictionary {
  if (locale === 'en') return en;
  if (locale === 'ky') return ky;
  return ru;
}

export function localizePath(locale: Locale, path = ''): string {
  const clean = path.replace(/^\//, '');
  if (locale === defaultLocale) {
    return clean ? `/${clean}` : '/';
  }
  return clean ? `/${locale}/${clean}` : `/${locale}/`;
}
