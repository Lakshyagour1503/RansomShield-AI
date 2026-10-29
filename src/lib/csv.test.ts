import { describe, expect, it } from 'vitest';
import { parseCsv, recordsToCsv } from '@/lib/csv';

describe('CSV data integrity', () => {
  it('imports quoted values and infers dynamic column types', () => {
    const result = parseCsv('name,score,label\n"sample, one",4.5,benign\nsecond,5,ransomware');
    expect(result.errors).toEqual([]);
    expect(result.headers).toEqual(['name', 'score', 'label']);
    expect(result.columns.map((column) => column.type)).toEqual(['text', 'number', 'text']);
    expect(result.rows[0].name).toBe('sample, one');
  });

  it('flags malformed structure, duplicate rows, and empty values without changing them', () => {
    const result = parseCsv('id,value\n1,\n1,\n2');
    expect(result.errors).toContain('Row 4 has 1 values; expected 2.');
    expect(result.errors).toContain('1 duplicate row detected.');
    expect(result.rows[0].value).toBe('');
  });

  it('exports values with commas and line breaks safely', () => {
    expect(recordsToCsv(['name', 'notes'], [{ name: 'a,b', notes: 'line 1\nline 2' }])).toBe('name,notes\n"a,b","line 1\nline 2"');
  });
});
