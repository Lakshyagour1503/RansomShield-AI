import { supabase } from '@/lib/supabase';
import type { CsvColumn } from '@/lib/csv';

export type Dataset = {
  id: string;
  name: string;
  source_filename: string | null;
  source_type: 'csv' | 'manual';
  columns: CsvColumn[];
  row_count: number;
  validation_status: 'pending' | 'valid' | 'invalid';
  validation_errors: string[];
  import_status: 'created' | 'imported' | 'failed';
  created_at: string;
  updated_at: string;
};

export type DatasetRecord = {
  id: string;
  dataset_id: string;
  row_number: number;
  values: Record<string, string>;
  validation_errors: string[];
  created_at: string;
  updated_at: string;
};

export type ScanHistoryRecord = {
  id: string;
  source: string;
  feature_record_id: string | null;
  prediction: string | null;
  confidence: number | null;
  model_version: string | null;
  status: 'pending' | 'completed' | 'failed' | 'not_connected';
  error_message: string | null;
  input_values: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ModelMetadata = {
  id: string;
  name: string;
  model_type: string;
  version: string | null;
  training_status: 'not_trained' | 'training' | 'trained' | 'failed';
  dataset_id: string | null;
  configuration: Record<string, unknown>;
  evaluation_status: 'not_available' | 'available';
  evaluation_metrics: Record<string, unknown> | null;
  trained_at: string | null;
  created_at: string;
  updated_at: string;
};

function requireClient() {
  if (!supabase) throw new Error('Database connection is not configured.');
  return supabase;
}

export async function listDatasets(): Promise<Dataset[]> {
  const client = requireClient();
  const { data, error } = await client.from('ransomshield_datasets').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Dataset[];
}

export async function createDataset(input: { name: string; sourceFilename?: string; sourceType: 'csv' | 'manual'; columns: CsvColumn[]; rows: Record<string, string>[]; validationErrors?: string[] }): Promise<Dataset> {
  const client = requireClient();
  const { data: dataset, error: datasetError } = await client.from('ransomshield_datasets').insert({
    name: input.name,
    source_filename: input.sourceFilename ?? null,
    source_type: input.sourceType,
    columns: input.columns,
    row_count: input.rows.length,
    validation_status: input.validationErrors?.length ? 'invalid' : 'valid',
    validation_errors: input.validationErrors ?? [],
    import_status: 'created',
  }).select('*').maybeSingle();
  if (datasetError || !dataset) throw new Error(datasetError?.message ?? 'Dataset could not be created.');

  if (input.rows.length) {
    const records = input.rows.map((values, index) => ({ dataset_id: dataset.id, row_number: index + 1, values, validation_errors: [] }));
    const { error: recordsError } = await client.from('ransomshield_dataset_records').insert(records);
    if (recordsError) {
      await client.from('ransomshield_datasets').update({ import_status: 'failed', validation_status: 'invalid', validation_errors: [recordsError.message] }).eq('id', dataset.id);
      throw new Error(recordsError.message);
    }
  }

  const { data: updated, error: updateError } = await client.from('ransomshield_datasets').update({ import_status: 'imported' }).eq('id', dataset.id).select('*').maybeSingle();
  if (updateError || !updated) throw new Error(updateError?.message ?? 'Dataset status could not be updated.');
  return updated as Dataset;
}

export async function createDatasetRecord(datasetId: string, rowNumber: number, values: Record<string, string>): Promise<DatasetRecord> {
  const client = requireClient();
  const { data, error } = await client.from('ransomshield_dataset_records').insert({ dataset_id: datasetId, row_number: rowNumber, values, validation_errors: [] }).select('*').maybeSingle();
  if (error || !data) throw new Error(error?.message ?? 'Record could not be added.');
  await syncDatasetRecordCount(datasetId);
  return data as DatasetRecord;
}

export async function syncDatasetRecordCount(datasetId: string): Promise<void> {
  const client = requireClient();
  const { count, error: countError } = await client.from('ransomshield_dataset_records').select('id', { count: 'exact', head: true }).eq('dataset_id', datasetId);
  if (countError) throw new Error(countError.message);
  const { error } = await client.from('ransomshield_datasets').update({ row_count: count ?? 0 }).eq('id', datasetId);
  if (error) throw new Error(error.message);
}

export async function listDatasetRecords(datasetId: string): Promise<DatasetRecord[]> {
  const client = requireClient();
  const { data, error } = await client.from('ransomshield_dataset_records').select('*').eq('dataset_id', datasetId).order('row_number', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DatasetRecord[];
}

export async function updateDatasetRecord(id: string, values: Record<string, string>): Promise<DatasetRecord> {
  const client = requireClient();
  const { data, error } = await client.from('ransomshield_dataset_records').update({ values }).eq('id', id).select('*').maybeSingle();
  if (error || !data) throw new Error(error?.message ?? 'Record could not be updated.');
  return data as DatasetRecord;
}

export async function deleteDatasetRecord(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('ransomshield_dataset_records').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDatasetRecords(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const client = requireClient();
  const { error } = await client.from('ransomshield_dataset_records').delete().in('id', ids);
  if (error) throw new Error(error.message);
}

export async function listScanHistory(): Promise<ScanHistoryRecord[]> {
  const client = requireClient();
  const { data, error } = await client.from('ransomshield_scan_history').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScanHistoryRecord[];
}

export async function createNotConnectedScan(inputValues: Record<string, unknown>): Promise<ScanHistoryRecord> {
  const client = requireClient();
  const { data, error } = await client.from('ransomshield_scan_history').insert({ source: 'manual', status: 'not_connected', input_values: inputValues, error_message: 'Detection backend is not connected.' }).select('*').maybeSingle();
  if (error || !data) throw new Error(error?.message ?? 'Scan record could not be created.');
  return data as ScanHistoryRecord;
}

export async function deleteScanRecord(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('ransomshield_scan_history').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getModelMetadata(): Promise<ModelMetadata[]> {
  const client = requireClient();
  const { data, error } = await client.from('ransomshield_model_metadata').select('*').order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ModelMetadata[];
}

export async function ensurePlannedModels(): Promise<void> {
  const client = requireClient();
  const { data, error } = await client.from('ransomshield_model_metadata').select('id').limit(1);
  if (error) throw new Error(error.message);
  if (data?.length) return;
  const { error: insertError } = await client.from('ransomshield_model_metadata').insert([
    { name: 'MLP baseline', model_type: 'MLP', training_status: 'not_trained', evaluation_status: 'not_available', configuration: { purpose: 'Static/tabular features' } },
    { name: 'BiLSTM branch', model_type: 'BiLSTM', training_status: 'not_trained', evaluation_status: 'not_available', configuration: { purpose: 'Ordered behavioral sequences', condition: 'Only when genuine sequences exist' } },
    { name: 'Hybrid fusion', model_type: 'MLP + BiLSTM', training_status: 'not_trained', evaluation_status: 'not_available', configuration: { purpose: 'Aligned static and behavioral representations', condition: 'Only when both branches are implemented' } },
  ]);
  if (insertError) throw new Error(insertError.message);
}

export async function getSetting(key: string): Promise<Record<string, unknown> | null> {
  const client = requireClient();
  const { data, error } = await client.from('ransomshield_settings').select('value').eq('key', key).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.value as Record<string, unknown> | undefined) ?? null;
}

export async function saveSetting(key: string, value: Record<string, unknown>): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('ransomshield_settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
}
