export type CsvValue = string;

export type CsvColumn = {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'empty' | 'mixed';
};

export type CsvValidation = {
  headers: string[];
  columns: CsvColumn[];
  rows: Record<string, CsvValue>[];
  errors: string[];
  duplicateRows: number;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  if (quoted) throw new Error('A quoted CSV field is not closed.');
  values.push(current.trim());
  return values;
}

function inferType(values: string[]): CsvColumn['type'] {
  const populated = values.filter((value) => value !== '');
  if (!populated.length) return 'empty';
  const numbers = populated.every((value) => Number.isFinite(Number(value)));
  if (numbers) return 'number';
  const booleans = populated.every((value) => ['true', 'false'].includes(value.toLowerCase()));
  if (booleans) return 'boolean';
  const text = populated.every((value) => Number.isNaN(Number(value)) && !['true', 'false'].includes(value.toLowerCase()));
  return text ? 'text' : 'mixed';
}

export function parseCsv(content: string): CsvValidation {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((line) => line.trim() !== '');
  if (!lines.length) return { headers: [], columns: [], rows: [], errors: ['The CSV file is empty.'], duplicateRows: 0 };

  let parsedLines: string[][];
  try {
    parsedLines = lines.map(parseCsvLine);
  } catch (error) {
    return { headers: [], columns: [], rows: [], errors: [error instanceof Error ? error.message : 'The CSV file could not be parsed.'], duplicateRows: 0 };
  }

  const headers = parsedLines[0].map((header) => header.trim());
  const errors: string[] = [];
  if (headers.some((header) => !header)) errors.push('Every column must have a name.');
  if (new Set(headers).size !== headers.length) errors.push('Column names must be unique.');
  if (parsedLines.length === 1) errors.push('The CSV has headers but no data rows.');

  const rows: Record<string, CsvValue>[] = [];
  parsedLines.slice(1).forEach((values, rowIndex) => {
    if (values.length !== headers.length) {
      errors.push(`Row ${rowIndex + 2} has ${values.length} values; expected ${headers.length}.`);
      return;
    }
    rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index]])));
  });

  const rowKeys = rows.map((row) => JSON.stringify(row));
  const duplicateRows = rowKeys.length - new Set(rowKeys).size;
  if (duplicateRows) errors.push(`${duplicateRows} duplicate row${duplicateRows === 1 ? '' : 's'} detected.`);

  const columns = headers.map((name, index) => ({ name, type: inferType(parsedLines.slice(1).map((row) => row[index] ?? '')) }));
  return { headers, columns, rows, errors, duplicateRows };
}

export function escapeCsvValue(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function recordsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
