// The back's rule for a business slug (sign-up.schema.ts, CHECK businesses_slug_format).
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const SLUG_MAX_LENGTH = 63

// Russian letters in Latin, close to how people spell their brand in a URL.
const CYRILLIC: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  // Ukrainian; и stays i as in Russian (one table serves both).
  і: 'i',
  ї: 'yi',
  є: 'ye',
  ґ: 'g',
}

// A suggested public page address for a business name; '' when the name has no
// Latin, Cyrillic or digits to build one from (the owner types it then).
export function slugFromName(name: string): string {
  // NFC first: й pasted as и + breve (NFD, e.g. from macOS) must match the table.
  const latin = [...name.normalize('NFC').toLowerCase()]
    .map((char) => CYRILLIC[char] ?? char)
    .join('')
    // é → e + accent, № → No: decompose, drop the accents, lowercase what appeared.
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()

  return latin
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '')
}
