// Predefined list of Israeli banks.
// `code` is the official bank number (מספר בנק), stored as `bank_number` in the DB.
// `name` is the Hebrew display name, stored as `bank_name`.
export interface IsraeliBank {
  code: number;
  name: string;
}

const RAW_BANKS: IsraeliBank[] = [
  { code: 4, name: 'בנק יהב' },
  { code: 9, name: 'בנק הדואר' },
  { code: 10, name: 'בנק לאומי' },
  { code: 11, name: 'בנק דיסקונט' },
  { code: 12, name: 'בנק הפועלים' },
  { code: 14, name: 'בנק אוצר החייל' },
  { code: 17, name: 'מרכנתיל' },
  { code: 18, name: 'ONE ZERO' },
  { code: 20, name: 'מזרחי טפחות' },
  { code: 31, name: 'הבנק הבינלאומי' },
  { code: 46, name: 'בנק מסד' },
  { code: 52, name: 'פאג״י' },
  { code: 54, name: 'בנק ירושלים' },
];

// Sorted alphabetically by Hebrew bank name.
export const ISRAELI_BANKS: IsraeliBank[] = [...RAW_BANKS].sort((a, b) =>
  a.name.localeCompare(b.name, 'he')
);

export function getBankNameByCode(code: string | number | null | undefined): string {
  if (code == null || code === '') return '';
  const numeric = typeof code === 'string' ? parseInt(code, 10) : code;
  return ISRAELI_BANKS.find((b) => b.code === numeric)?.name ?? '';
}
