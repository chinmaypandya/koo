// Matches → CSV (opens directly in Excel). Column order is what the user sees in the spreadsheet.
const COLUMNS: [string, (r: any) => unknown][] = [
  ['found_at', (r) => r.seenAt && new Date(r.seenAt).toISOString()],
  ['society_name', (r) => r.society_name],
  ['location', (r) => r.location],
  ['bhk', (r) => r.bhk],
  ['rent', (r) => r.price],
  ['deposit', (r) => r.deposit],
  ['budget_difference', (r) => r.budget_difference],
  ['distance_km', (r) => r.distance_km],
  ['amenities_score', (r) => r.amenities_score],
  ['contact', (r) => r.contact?.join('; ')],
  ['country_code', (r) => r.country_code],
  ['country_code_source', (r) => r.country_code_source], // "number" = written in the post, "ai" = guessed
  ['author', (r) => r.author],
  ['author_url', (r) => r.author_url],
  ['post_url', (r) => r.url],
  ['verdict', (r) => r.verdict],
  ['raw_text', (r) => r.raw_text],
];

const cell = (v: unknown) => {
  if (v == null || v === '') return '';
  // Post text is untrusted: stop Excel treating text like "=HYPERLINK(...)" as a formula. Numbers (e.g. -2000) are left alone.
  const s = typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows: any[]) =>
  [COLUMNS.map(([name]) => name), ...rows.map((r) => COLUMNS.map(([, get]) => get(r)))].map((row) => row.map(cell).join(',')).join('\r\n');
