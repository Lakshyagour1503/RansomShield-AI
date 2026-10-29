import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: fromMock } }));

import { createDatasetRecord, deleteDatasetRecords, deleteScanRecord, updateDatasetRecord } from '@/lib/repository';

function query(result: { data?: unknown; error?: unknown }) {
  const chain = {
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => Promise.resolve(result)),
    select: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };
  return chain;
}

describe('repository CRUD operations', () => {
  beforeEach(() => fromMock.mockReset());

  it('adds a record through the dataset records table', async () => {
    const record = { id: 'record-1', dataset_id: 'dataset-1', row_number: 1, values: { label: 'benign' } };
    const recordQuery = query({ data: record, error: null });
    const countQuery = query({ data: null, error: null });
    const datasetQuery = query({ data: null, error: null });
    fromMock.mockReturnValueOnce(recordQuery).mockReturnValueOnce(countQuery).mockReturnValueOnce(datasetQuery);
    await expect(createDatasetRecord('dataset-1', 1, { label: 'benign' })).resolves.toEqual(record);
    expect(recordQuery.insert).toHaveBeenCalledWith({ dataset_id: 'dataset-1', row_number: 1, values: { label: 'benign' }, validation_errors: [] });
  });

  it('updates an existing record without changing its identifier', async () => {
    const record = { id: 'record-1', values: { label: 'ransomware' } };
    const recordQuery = query({ data: record, error: null });
    fromMock.mockReturnValue(recordQuery);
    await expect(updateDatasetRecord('record-1', { label: 'ransomware' })).resolves.toEqual(record);
    expect(recordQuery.update).toHaveBeenCalledWith({ values: { label: 'ransomware' } });
    expect(recordQuery.eq).toHaveBeenCalledWith('id', 'record-1');
  });

  it('deletes selected records and scan history rows', async () => {
    const recordsQuery = query({ data: null, error: null });
    fromMock.mockReturnValueOnce(recordsQuery);
    await expect(deleteDatasetRecords(['record-1', 'record-2'])).resolves.toBeUndefined();
    expect(recordsQuery.in).toHaveBeenCalledWith('id', ['record-1', 'record-2']);

    const scanQuery = query({ data: null, error: null });
    fromMock.mockReturnValueOnce(scanQuery);
    await expect(deleteScanRecord('scan-1')).resolves.toBeUndefined();
    expect(scanQuery.eq).toHaveBeenCalledWith('id', 'scan-1');
  });
});
