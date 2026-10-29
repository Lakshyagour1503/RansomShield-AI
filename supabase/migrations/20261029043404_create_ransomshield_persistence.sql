/*
# Create RansomShield persistence tables

1. New tables
- `ransomshield_datasets`: one row per imported or manually created dataset, including its original name, dynamic schema, validation state, and record count.
- `ransomshield_dataset_records`: one row per dataset record, preserving original CSV values as JSON without assuming fixed feature names.
- `ransomshield_scan_history`: durable audit records for prediction requests, including optional prediction fields and backend errors.
- `ransomshield_model_metadata`: model registry rows for planned and verified model versions, including training and evaluation status.
- `ransomshield_settings`: application-level configuration stored as JSON, such as the detection backend connection.

2. Columns and data integrity
- Every table has a UUID primary key and creation/update timestamps.
- Dataset records reference their parent dataset and are deleted with that dataset.
- Dynamic columns and feature values are stored in JSONB so unknown feature names are retained exactly.
- Scan predictions and metrics are nullable and remain empty until a real backend provides them.
- Updated timestamps are maintained by a trigger on mutable tables.

3. Security
- Row-level security is enabled on every table.
- This project has no sign-in screen, so the intentionally single-tenant prototype grants the anon and authenticated roles only the CRUD operations used by the app.
- Policies are separated by CRUD verb and use `USING (true)` because all records belong to this single shared project workspace.

4. Important notes
- No executable files are stored or executed by these tables.
- JSONB is used for dynamic dataset schemas; values are preserved as imported and are not silently coerced.
- Evaluation metrics are optional and must only be written after genuine model evaluation.
*/

CREATE TABLE IF NOT EXISTS public.ransomshield_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_filename text,
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('csv', 'manual')),
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  import_status text NOT NULL DEFAULT 'created' CHECK (import_status IN ('created', 'imported', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ransomshield_dataset_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.ransomshield_datasets(id) ON DELETE CASCADE,
  row_number integer NOT NULL CHECK (row_number > 0),
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset_id, row_number)
);

CREATE TABLE IF NOT EXISTS public.ransomshield_scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'manual',
  feature_record_id uuid REFERENCES public.ransomshield_dataset_records(id) ON DELETE SET NULL,
  prediction text,
  confidence numeric,
  model_version text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'not_connected')),
  error_message text,
  input_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ransomshield_model_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  model_type text NOT NULL,
  version text,
  training_status text NOT NULL DEFAULT 'not_trained' CHECK (training_status IN ('not_trained', 'training', 'trained', 'failed')),
  dataset_id uuid REFERENCES public.ransomshield_datasets(id) ON DELETE SET NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluation_status text NOT NULL DEFAULT 'not_available' CHECK (evaluation_status IN ('not_available', 'available')),
  evaluation_metrics jsonb,
  trained_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ransomshield_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ransomshield_dataset_records_dataset_id_idx ON public.ransomshield_dataset_records(dataset_id);
CREATE INDEX IF NOT EXISTS ransomshield_scan_history_created_at_idx ON public.ransomshield_scan_history(created_at DESC);
CREATE INDEX IF NOT EXISTS ransomshield_model_metadata_created_at_idx ON public.ransomshield_model_metadata(created_at DESC);

CREATE OR REPLACE FUNCTION public.ransomshield_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ransomshield_datasets_updated_at ON public.ransomshield_datasets;
CREATE TRIGGER ransomshield_datasets_updated_at BEFORE UPDATE ON public.ransomshield_datasets FOR EACH ROW EXECUTE FUNCTION public.ransomshield_set_updated_at();
DROP TRIGGER IF EXISTS ransomshield_dataset_records_updated_at ON public.ransomshield_dataset_records;
CREATE TRIGGER ransomshield_dataset_records_updated_at BEFORE UPDATE ON public.ransomshield_dataset_records FOR EACH ROW EXECUTE FUNCTION public.ransomshield_set_updated_at();
DROP TRIGGER IF EXISTS ransomshield_scan_history_updated_at ON public.ransomshield_scan_history;
CREATE TRIGGER ransomshield_scan_history_updated_at BEFORE UPDATE ON public.ransomshield_scan_history FOR EACH ROW EXECUTE FUNCTION public.ransomshield_set_updated_at();
DROP TRIGGER IF EXISTS ransomshield_model_metadata_updated_at ON public.ransomshield_model_metadata;
CREATE TRIGGER ransomshield_model_metadata_updated_at BEFORE UPDATE ON public.ransomshield_model_metadata FOR EACH ROW EXECUTE FUNCTION public.ransomshield_set_updated_at();
DROP TRIGGER IF EXISTS ransomshield_settings_updated_at ON public.ransomshield_settings;
CREATE TRIGGER ransomshield_settings_updated_at BEFORE UPDATE ON public.ransomshield_settings FOR EACH ROW EXECUTE FUNCTION public.ransomshield_set_updated_at();

ALTER TABLE public.ransomshield_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ransomshield_dataset_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ransomshield_scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ransomshield_model_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ransomshield_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ransomshield_datasets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ransomshield_dataset_records TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ransomshield_scan_history TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ransomshield_model_metadata TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ransomshield_settings TO anon, authenticated;

DROP POLICY IF EXISTS "shared_select_ransomshield_datasets" ON public.ransomshield_datasets;
CREATE POLICY "shared_select_ransomshield_datasets" ON public.ransomshield_datasets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_ransomshield_datasets" ON public.ransomshield_datasets;
CREATE POLICY "shared_insert_ransomshield_datasets" ON public.ransomshield_datasets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_ransomshield_datasets" ON public.ransomshield_datasets;
CREATE POLICY "shared_update_ransomshield_datasets" ON public.ransomshield_datasets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_ransomshield_datasets" ON public.ransomshield_datasets;
CREATE POLICY "shared_delete_ransomshield_datasets" ON public.ransomshield_datasets FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_ransomshield_dataset_records" ON public.ransomshield_dataset_records;
CREATE POLICY "shared_select_ransomshield_dataset_records" ON public.ransomshield_dataset_records FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_ransomshield_dataset_records" ON public.ransomshield_dataset_records;
CREATE POLICY "shared_insert_ransomshield_dataset_records" ON public.ransomshield_dataset_records FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_ransomshield_dataset_records" ON public.ransomshield_dataset_records;
CREATE POLICY "shared_update_ransomshield_dataset_records" ON public.ransomshield_dataset_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_ransomshield_dataset_records" ON public.ransomshield_dataset_records;
CREATE POLICY "shared_delete_ransomshield_dataset_records" ON public.ransomshield_dataset_records FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_ransomshield_scan_history" ON public.ransomshield_scan_history;
CREATE POLICY "shared_select_ransomshield_scan_history" ON public.ransomshield_scan_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_ransomshield_scan_history" ON public.ransomshield_scan_history;
CREATE POLICY "shared_insert_ransomshield_scan_history" ON public.ransomshield_scan_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_ransomshield_scan_history" ON public.ransomshield_scan_history;
CREATE POLICY "shared_update_ransomshield_scan_history" ON public.ransomshield_scan_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_ransomshield_scan_history" ON public.ransomshield_scan_history;
CREATE POLICY "shared_delete_ransomshield_scan_history" ON public.ransomshield_scan_history FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_ransomshield_model_metadata" ON public.ransomshield_model_metadata;
CREATE POLICY "shared_select_ransomshield_model_metadata" ON public.ransomshield_model_metadata FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_ransomshield_model_metadata" ON public.ransomshield_model_metadata;
CREATE POLICY "shared_insert_ransomshield_model_metadata" ON public.ransomshield_model_metadata FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_ransomshield_model_metadata" ON public.ransomshield_model_metadata;
CREATE POLICY "shared_update_ransomshield_model_metadata" ON public.ransomshield_model_metadata FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_ransomshield_model_metadata" ON public.ransomshield_model_metadata;
CREATE POLICY "shared_delete_ransomshield_model_metadata" ON public.ransomshield_model_metadata FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_ransomshield_settings" ON public.ransomshield_settings;
CREATE POLICY "shared_select_ransomshield_settings" ON public.ransomshield_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_ransomshield_settings" ON public.ransomshield_settings;
CREATE POLICY "shared_insert_ransomshield_settings" ON public.ransomshield_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_ransomshield_settings" ON public.ransomshield_settings;
CREATE POLICY "shared_update_ransomshield_settings" ON public.ransomshield_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_ransomshield_settings" ON public.ransomshield_settings;
CREATE POLICY "shared_delete_ransomshield_settings" ON public.ransomshield_settings FOR DELETE TO anon, authenticated USING (true);
