import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  CloudUpload,
  Database,
  Download,
  FileBarChart,
  FileCode2,
  FileSpreadsheet,
  FolderOpen,
  Gauge,
  History,
  LayoutDashboard,
  Menu,
  Network,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Table2,
  X,
  XCircle,
  Zap,
  Pencil as PencilIcon,
  Trash2 as TrashIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { downloadCsv, parseCsv, recordsToCsv, type CsvValidation } from '@/lib/csv';
import {
  createDataset,
  createDatasetRecord,
  createNotConnectedScan,
  deleteDatasetRecords,
  deleteScanRecord,
  ensurePlannedModels,
  getModelMetadata,
  getSetting,
  listDatasetRecords,
  listDatasets,
  listScanHistory,
  saveSetting,
  syncDatasetRecordCount,
  updateDatasetRecord,
  type Dataset,
  type DatasetRecord,
  type ModelMetadata,
  type ScanHistoryRecord,
} from '@/lib/repository';

type PageKey = 'dashboard' | 'scanner' | 'datasets' | 'models' | 'evaluation' | 'history' | 'reports' | 'settings';

type NavItem = {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'scanner', label: 'Detection Scanner', icon: ShieldAlert },
  { key: 'datasets', label: 'Dataset Management', icon: Database },
  { key: 'models', label: 'Model Management', icon: BrainCircuit },
  { key: 'evaluation', label: 'Evaluation', icon: BarChart3 },
  { key: 'history', label: 'Scan History', icon: History },
  { key: 'reports', label: 'Reports', icon: FileBarChart },
];

const chartData = [
  { day: 'Mon', scans: 0 },
  { day: 'Tue', scans: 0 },
  { day: 'Wed', scans: 0 },
  { day: 'Thu', scans: 0 },
  { day: 'Fri', scans: 0 },
  { day: 'Sat', scans: 0 },
  { day: 'Sun', scans: 0 },
];

const recentScans = [
  { id: 'RS-0001', source: 'Awaiting connected backend', time: '—', status: 'Not available', tone: 'neutral' },
  { id: 'RS-0002', source: 'No scan records yet', time: '—', status: 'Empty', tone: 'neutral' },
  { id: 'RS-0003', source: 'Connect Python API to begin', time: '—', status: 'Awaiting setup', tone: 'warning' },
];

function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [range, setRange] = useState('7 days');
  const [lastSynced, setLastSynced] = useState('Just now');

  const activeLabel = useMemo(
    () => navItems.find((item) => item.key === activePage)?.label ?? 'Dashboard',
    [activePage],
  );

  const navigate = (page: PageKey) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const refresh = () => setLastSynced('Updated just now');

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Shield size={20} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-name">RansomShield <span>AI</span></div>
            <div className="brand-subtitle">Detection intelligence</div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="workspace-card">
          <div className="workspace-icon"><Network size={16} /></div>
          <div><span className="eyebrow">Workspace</span><strong>Major Project · CSE</strong></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <div className="nav-label">Workspace</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={`nav-item ${activePage === item.key ? 'active' : ''}`} onClick={() => navigate(item.key)}>
                <Icon size={18} /> <span>{item.label}</span>
                {item.key === 'scanner' && <span className="nav-pulse" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className={`nav-item ${activePage === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><Settings size={18} /><span>Settings</span></button>
          <div className="sidebar-status"><span className="status-dot offline" /><div><strong>Backend not connected</strong><small>Configure your Python API</small></div><ArrowUpRight size={14} /></div>
          <div className="student-chip"><div className="avatar">AS</div><div><strong>Project workspace</strong><small>B.Tech CSE · Phase I</small></div><MoreDots /></div>
        </div>
      </aside>

      {sidebarOpen && <button className="mobile-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div><span className="breadcrumb">Workspace /</span><h1>{activeLabel}</h1></div></div>
          <div className="topbar-actions"><div className="connection-pill"><span className="status-dot offline" /> API offline</div><button className="icon-button" aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button><div className="top-avatar">AS</div></div>
        </header>

        <div className="page-content">
          {activePage === 'dashboard' && <Dashboard range={range} setRange={setRange} lastSynced={lastSynced} refresh={refresh} navigate={navigate} />}
          {activePage === 'scanner' && <Scanner navigate={navigate} />}
          {activePage === 'datasets' && <Datasets />}
          {activePage === 'models' && <Models navigate={navigate} />}
          {activePage === 'evaluation' && <Evaluation navigate={navigate} />}
          {activePage === 'history' && <HistoryPage />}
          {activePage === 'reports' && <Reports />}
          {activePage === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

function Dashboard({ range, setRange, lastSynced, refresh, navigate }: { range: string; setRange: (value: string) => void; lastSynced: string; refresh: () => void; navigate: (page: PageKey) => void }) {
  return <>
    <section className="page-intro"><div><div className="overline"><span className="live-dot" /> Defensive analysis workspace</div><h2>Good morning, team.</h2><p>Monitor your ransomware detection research from one secure workspace.</p></div><div className="intro-actions"><span className="sync-label"><Clock3 size={14} /> Synced {lastSynced}</span><button className="button secondary" onClick={refresh}><RefreshCw size={15} /> Refresh</button><button className="button primary" onClick={() => navigate('scanner')}><Play size={15} fill="currentColor" /> New scan</button></div></section>
    <div className="notice-banner"><div className="notice-icon"><CircleHelp size={17} /></div><div><strong>Model outputs are not available yet.</strong><span>Connect your Python Flask detection API and provide validated labeled data before running real predictions or evaluation.</span></div><button onClick={() => navigate('settings')}>Configure connection <ArrowUpRight size={14} /></button></div>
    <section className="metric-grid"><MetricCard icon={<Database size={18} />} label="Dataset records" value="—" detail="Awaiting import" tone="cyan" /><MetricCard icon={<ShieldAlert size={18} />} label="Scans completed" value="0" detail="No scans recorded" tone="blue" /><MetricCard icon={<BrainCircuit size={18} />} label="Model status" value="Not trained" detail="MLP baseline planned" tone="amber" /><MetricCard icon={<Gauge size={18} />} label="Detection confidence" value="—" detail="No evaluation results" tone="slate" /></section>
    <section className="dashboard-grid"><div className="panel chart-panel"><PanelHeader title="Scan activity" subtitle="Prediction requests over time" action={<div className="segmented-control">{['7 days', '30 days', '90 days'].map((item) => <button key={item} className={range === item ? 'selected' : ''} onClick={() => setRange(item)}>{item}</button>)}</div>} /><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}><defs><linearGradient id="scanGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#39c9d2" stopOpacity={0.3} /><stop offset="100%" stopColor="#39c9d2" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#223451" vertical={false} /><XAxis dataKey="day" stroke="#73819c" tickLine={false} axisLine={false} fontSize={11} /><YAxis stroke="#73819c" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="scans" stroke="#39c9d2" strokeWidth={2} fill="url(#scanGradient)" /></AreaChart></ResponsiveContainer><div className="chart-empty"><Activity size={17} /><span>No scan activity yet</span></div></div></div><div className="panel readiness-panel"><PanelHeader title="System readiness" subtitle="Configuration checklist" /><div className="readiness-list"><ReadinessItem label="Frontend workspace" done /><ReadinessItem label="Data persistence" detail="Stage 2" /><ReadinessItem label="Python API connection" detail="Required" /><ReadinessItem label="Trained model" detail="Not available" /></div><button className="text-button" onClick={() => navigate('settings')}>View setup settings <ArrowUpRight size={14} /></button></div></section>
    <section className="dashboard-grid lower-grid"><div className="panel recent-panel"><PanelHeader title="Recent scans" subtitle="Latest detection requests" action={<button className="text-button" onClick={() => navigate('history')}>View history <ArrowUpRight size={14} /></button>} /><div className="scan-table">{recentScans.map((scan) => <div className="scan-row" key={scan.id}><div className="scan-id"><span className="scan-symbol"><FileCode2 size={15} /></span><div><strong>{scan.id}</strong><small>{scan.source}</small></div></div><span className="row-time">{scan.time}</span><span className={`status-tag ${scan.tone}`}>{scan.status}</span></div>)}</div></div><div className="panel architecture-panel"><PanelHeader title="Proposed architecture" subtitle="Phase I design reference" /><div className="architecture-flow"><div className="arch-node"><Database size={16} /><span>Static features</span><small>Tabular inputs</small></div><div className="flow-line" /><div className="arch-node planned"><BrainCircuit size={16} /><span>MLP branch</span><small>Planned</small></div><div className="flow-line" /><div className="arch-node planned"><Activity size={16} /><span>BiLSTM branch</span><small>Conditional</small></div><div className="flow-line" /><div className="arch-node fusion"><Zap size={16} /><span>Fusion</span><small>Future stage</small></div></div><div className="architecture-note"><AlertCircle size={14} /> Sequence branch activates only when genuine ordered behavioral data is available.</div></div></section>
  </>;
}

function Scanner({ navigate }: { navigate: (page: PageKey) => void }) {
  const [mode, setMode] = useState('record');
  const [submitted, setSubmitted] = useState(false);
  const [recordId, setRecordId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return <><section className="page-intro"><div><div className="overline"><ShieldAlert size={14} /> Defensive prediction interface</div><h2>Detection scanner</h2><p>Submit a validated feature record to the configured detection service.</p></div><div className="connection-pill"><span className="status-dot offline" /> Backend not connected</div></section><div className="scanner-layout"><div className="panel scanner-form"><div className="panel-tabs"><button className={mode === 'record' ? 'selected' : ''} onClick={() => setMode('record')}><Table2 size={16} /> Feature record</button><button className={mode === 'file' ? 'selected' : ''} onClick={() => setMode('file')}><FileSpreadsheet size={16} /> Upload file</button></div>{mode === 'record' ? <><div className="form-heading"><div><h3>Static feature record</h3><p>Enter values only from a trusted, documented dataset.</p></div><span className="tag planned">Schema not configured</span></div><div className="field-grid"><div className="field"><label>Record identifier</label><input value={recordId} onChange={(event) => setRecordId(event.target.value)} placeholder="e.g. sample-001" /></div><Field label="File entropy" placeholder="Awaiting schema" disabled /><Field label="API call count" placeholder="Awaiting schema" disabled /><Field label="File operations" placeholder="Awaiting schema" disabled /></div><div className="field"><label>Notes <span>Optional</span></label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add context for this scan..." /></div><div className="form-actions"><button className="button secondary" onClick={() => { setSubmitted(false); setRecordId(''); setNotes(''); setError(''); }}>Clear form</button><button className="button primary" disabled={saving || !recordId.trim()} onClick={() => { setSaving(true); setError(''); void createNotConnectedScan({ record_id: recordId.trim(), notes }).then(() => setSubmitted(true)).catch((scanError) => setError(scanError instanceof Error ? scanError.message : 'Scan could not be saved.')).finally(() => setSaving(false)); }}><Play size={15} fill="currentColor" /> {saving ? 'Saving…' : 'Submit for detection'}</button></div>{error && <div className="inline-message error"><AlertCircle size={16} /><span>{error}</span></div>}{submitted && <div className="inline-message warning"><AlertCircle size={16} /><span>The request was saved to scan history, but no detection backend is connected. No prediction was generated.</span></div>}</> : <div className="upload-zone"><div className="upload-icon"><CloudUpload size={24} /></div><h3>Drop a validated feature file here</h3><p>CSV files will be supported once dataset persistence is connected.</p><button className="button secondary"><FolderOpen size={15} /> Choose file</button><small>Do not upload executables or live ransomware samples.</small></div>}</div><div className="scanner-side"><div className="panel result-panel"><div className="result-top"><span className="eyebrow">Latest result</span><span className="status-tag neutral">Awaiting request</span></div><div className="result-placeholder"><div className="result-shield"><Shield size={31} /></div><h3>No prediction yet</h3><p>Results will appear here after the Flask API is configured and a real feature record is submitted.</p></div></div><div className="panel safety-card"><div className="safety-icon"><Shield size={16} /></div><div><strong>Defensive workflow only</strong><p>This interface accepts feature records for analysis. It never executes uploaded files.</p></div></div><button className="setup-link" onClick={() => navigate('settings')}>Configure detection backend <ArrowUpRight size={14} /></button></div></div></>;
}

function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [records, setRecords] = useState<DatasetRecord[]>([]);
  const [preview, setPreview] = useState<{ fileName: string; parsed: CsvValidation } | null>(null);
  const [editingRecord, setEditingRecord] = useState<DatasetRecord | null>(null);
  const [newRecord, setNewRecord] = useState<Record<string, string> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortAscending, setSortAscending] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const pageSize = 8;
  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId) ?? null;

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const loaded = await listDatasets();
      setDatasets(loaded);
      const nextId = selectedDatasetId && loaded.some((dataset) => dataset.id === selectedDatasetId) ? selectedDatasetId : loaded[0]?.id ?? '';
      setSelectedDatasetId(nextId);
      if (nextId) setRecords(await listDatasetRecords(nextId));
      else setRecords([]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Datasets could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [selectedDatasetId]);

  useEffect(() => { void loadDatasets(); }, [loadDatasets]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    try {
      setPreview({ fileName: file.name, parsed: parseCsv(await file.text()) });
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'The file could not be read.');
    }
  };

  const importPreview = async () => {
    if (!preview || preview.parsed.errors.length) return;
    setBusy(true);
    setError('');
    try {
      await createDataset({ name: preview.fileName.replace(/\\.csv$/i, ''), sourceFilename: preview.fileName, sourceType: 'csv', columns: preview.parsed.columns, rows: preview.parsed.rows });
      setPreview(null);
      setMessage('Dataset imported successfully.');
      await loadDatasets();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Dataset import failed.');
    } finally {
      setBusy(false);
    }
  };

  const selectDataset = async (id: string) => {
    setSelectedDatasetId(id);
    setPage(1);
    setError('');
    try { setRecords(await listDatasetRecords(id)); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Records could not be loaded.'); }
  };

  const removeRecords = async (ids: string[]) => {
    if (!ids.length || !window.confirm(`Delete ${ids.length} record${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteDatasetRecords(ids);
      await syncDatasetRecordCount(selectedDatasetId);
      setMessage(`${ids.length} record${ids.length === 1 ? '' : 's'} deleted.`);
      await selectDataset(selectedDatasetId);
      await loadDatasets();
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Records could not be deleted.'); } finally { setBusy(false); }
  };

  const saveEditedRecord = async () => {
    if (!editingRecord) return;
    setBusy(true);
    try {
      await updateDatasetRecord(editingRecord.id, editingRecord.values);
      setEditingRecord(null);
      setMessage('Record updated successfully.');
      await selectDataset(selectedDatasetId);
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Record could not be updated.'); } finally { setBusy(false); }
  };

  const addRecord = async () => {
    if (!selectedDataset || !newRecord) return;
    setBusy(true);
    try {
      await createDatasetRecord(selectedDataset.id, records.length + 1, newRecord);
      setNewRecord(null);
      setMessage('Record added successfully.');
      await selectDataset(selectedDataset.id);
      await loadDatasets();
    } catch (addError) { setError(addError instanceof Error ? addError.message : 'Record could not be added.'); } finally { setBusy(false); }
  };

  const filteredRecords = records.filter((record) => Object.values(record.values).some((value) => value.toLowerCase().includes(search.toLowerCase()))).sort((a, b) => (sortAscending ? a.row_number - b.row_number : b.row_number - a.row_number));
  const visibleRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const headers = selectedDataset?.columns.map((column) => column.name) ?? [];

  return <PageScaffold overline="Data foundation" title="Dataset management" description="Prepare, validate, and maintain the records used by your research workflow." action={<><input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={handleFile} /><button className="button primary" onClick={() => fileInput.current?.click()}><CloudUpload size={15} /> Import CSV</button></>}>
    {error && <div className="inline-message error"><AlertCircle size={16} /><span>{error}</span><button className="icon-button" onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button></div>}
    {message && <div className="inline-message success"><Check size={16} /><span>{message}</span><button className="icon-button" onClick={() => setMessage('')} aria-label="Dismiss success"><X size={14} /></button></div>}
    {preview && <div className="panel import-preview"><div className="section-heading"><div><h3>Preview: {preview.fileName}</h3><p>{preview.parsed.rows.length} data rows · {preview.parsed.headers.length} columns detected</p></div><button className="icon-button" onClick={() => setPreview(null)} aria-label="Close preview"><X size={16} /></button></div>{preview.parsed.errors.length ? <div className="validation-errors">{preview.parsed.errors.map((validationError) => <div key={validationError}><XCircle size={14} /> {validationError}</div>)}</div> : <><div className="column-chips">{preview.parsed.columns.map((column) => <span key={column.name}>{column.name} <small>{column.type}</small></span>)}</div><div className="preview-table"><div className="preview-row header">{preview.parsed.headers.map((header) => <span key={header}>{header}</span>)}</div>{preview.parsed.rows.slice(0, 4).map((row, index) => <div className="preview-row" key={index}>{preview.parsed.headers.map((header) => <span key={header}>{row[header] || '—'}</span>)}</div>)}</div><div className="form-actions"><button className="button secondary" onClick={() => setPreview(null)}>Cancel</button><button className="button primary" disabled={busy} onClick={() => void importPreview()}><Check size={15} /> {busy ? 'Importing…' : 'Confirm import'}</button></div></>}</div>}
    <div className="dataset-hero panel"><div className="empty-illustration"><Database size={28} /></div><div><h3>{datasets.length ? `${datasets.length} dataset${datasets.length === 1 ? '' : 's'} available` : 'No datasets imported'}</h3><p>{datasets.length ? 'Select a dataset below to inspect and manage its records.' : 'Import a CSV to preview its columns, validate labels, and begin building a reproducible dataset inventory.'}</p><button className="button secondary" onClick={() => fileInput.current?.click()}><CloudUpload size={15} /> Import CSV</button></div><div className="dataset-stats"><span><strong>{selectedDataset?.row_count ?? 0}</strong> records</span><span><strong>{datasets.length}</strong> datasets</span><span><strong>{selectedDataset?.import_status ?? '—'}</strong> status</span></div></div>
    {datasets.length > 0 && <><div className="dataset-selector">{datasets.map((dataset) => <button key={dataset.id} className={selectedDatasetId === dataset.id ? 'selected' : ''} onClick={() => void selectDataset(dataset.id)}><FileSpreadsheet size={15} /><span><strong>{dataset.name}</strong><small>{dataset.row_count} records · {dataset.validation_status}</small></span></button>)}</div><div className="section-heading"><div><h3>Records in {selectedDataset?.name}</h3><p>Original feature names and values are retained without fixed-column assumptions.</p></div><div className="toolbar-actions"><button className="button secondary" onClick={() => setNewRecord(Object.fromEntries(headers.map((header) => [header, ''])))}><Plus size={15} /> Add record</button><button className="button ghost" onClick={() => downloadCsv(`${selectedDataset?.name ?? 'dataset'}.csv`, recordsToCsv(headers, records.map((record) => record.values)))}><Download size={15} /> Export</button></div></div><div className="toolbar panel"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search any feature value…" /></div><button className="button ghost" onClick={() => setSortAscending(!sortAscending)}><ArrowUpRight size={15} /> Sort {sortAscending ? 'ascending' : 'descending'}</button><button className="button ghost" onClick={() => void removeRecords(visibleRecords.map((record) => record.id))}><TrashIcon size={15} /> Delete visible</button></div>{loading ? <div className="panel loading-state"><RefreshCw size={18} className="spin" /> Loading records…</div> : visibleRecords.length ? <div className="panel records-table"><div className="record-grid record-header"><span>#</span>{headers.map((header) => <span key={header}>{header}</span>)}<span>Actions</span></div>{visibleRecords.map((record) => <div className="record-grid" key={record.id}><span>{record.row_number}</span>{headers.map((header) => <span key={header} title={record.values[header]}>{record.values[header] || '—'}</span>)}<span className="row-actions"><button className="icon-button" onClick={() => setEditingRecord(record)} aria-label={`Edit record ${record.row_number}`}><PencilIcon size={14} /></button><button className="icon-button danger" onClick={() => void removeRecords([record.id])} aria-label={`Delete record ${record.row_number}`}><TrashIcon size={14} /></button></span></div>)}</div> : <EmptyTable icon={<Table2 size={21} />} title="No matching records" description={records.length ? 'Try a different search term.' : 'Add a record or import a CSV to populate this dataset.'} />}{(editingRecord || newRecord) && <RecordEditor record={editingRecord} values={newRecord ?? editingRecord?.values ?? {}} headers={headers} onChange={(values) => editingRecord ? setEditingRecord({ ...editingRecord, values }) : setNewRecord(values)} onCancel={() => { setEditingRecord(null); setNewRecord(null); }} onSave={() => void (editingRecord ? saveEditedRecord() : addRecord())} busy={busy} />}{filteredRecords.length > pageSize && <div className="pagination"><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length}</span><div><button className="button ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} / {totalPages}</span><button className="button ghost" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button></div></div>}</>}
    {!datasets.length && !loading && <EmptyTable icon={<Table2 size={21} />} title="Your dataset inventory is empty" description="Imported files and validation status will be shown here in this table." />}
  </PageScaffold>;
}
function Models({ navigate }: { navigate: (page: PageKey) => void }) {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void ensurePlannedModels().then(() => getModelMetadata()).then(setModels).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Models could not be loaded.')); }, []);
  return <PageScaffold overline="Model lifecycle" title="Model management" description="Track the planned MLP baseline, conditional sequence branch, and reproducible model versions.">{error && <div className="inline-message error"><AlertCircle size={16} /> {error}</div>}<div className="model-status panel"><div className="model-status-icon"><BrainCircuit size={25} /></div><div className="model-status-copy"><span className="eyebrow">Current model</span><h3>{models.some((model) => model.training_status === 'trained') ? 'Trained model available' : 'Not trained'}</h3><p>No labeled dataset or training run is available yet. This workspace will never invent evaluation results.</p></div><span className="status-tag neutral">{models.length ? `${models.length} tracked versions` : 'Loading metadata'}</span></div><div className="model-grid">{models.map((model) => <InfoCard key={model.id} title={model.name} icon={model.model_type === 'MLP' ? <BrainCircuit size={18} /> : model.model_type === 'BiLSTM' ? <Activity size={18} /> : <Network size={18} />} status={model.training_status === 'not_trained' ? (model.model_type === 'BiLSTM' ? 'Conditional' : 'Planned') : model.training_status} text={`${model.model_type} · ${model.evaluation_status === 'available' ? 'Evaluation available' : 'No evaluation results'}. ${String(model.configuration.condition ?? model.configuration.purpose ?? '')}`} action="View configuration" />)}</div><div className="panel next-step"><div className="next-step-icon"><Sparkles size={18} /></div><div><h3>Recommended next step</h3><p>Import and validate a labeled dataset before connecting a model training workflow.</p></div><button className="button secondary" onClick={() => navigate('datasets')}>Open datasets <ArrowUpRight size={14} /></button></div></PageScaffold>; }
function Evaluation({ navigate }: { navigate: (page: PageKey) => void }) { return <PageScaffold overline="Evidence and metrics" title="Evaluation" description="Review held-out test results only after they have been generated by your own connected training run."><div className="evaluation-empty panel"><div className="evaluation-art"><BarChart3 size={32} /></div><span className="status-tag neutral">No evaluation results</span><h3>Metrics will appear after a genuine test run</h3><p>Accuracy, precision, recall, F1-score, ROC-AUC, and the confusion matrix are intentionally blank until the connected backend provides verified results.</p><button className="button secondary" onClick={() => navigate('models')}>Review model status <ArrowUpRight size={14} /></button></div><div className="metric-grid evaluation-guides"><MetricCard icon={<Gauge size={18} />} label="Precision" value="—" detail="No test output" tone="slate" /><MetricCard icon={<Activity size={18} />} label="Recall" value="—" detail="No test output" tone="slate" /><MetricCard icon={<BarChart3 size={18} />} label="F1-score" value="—" detail="No test output" tone="slate" /><MetricCard icon={<Network size={18} />} label="ROC-AUC" value="—" detail="No test output" tone="slate" /></div></PageScaffold>; }
function HistoryPage() {
  const [scans, setScans] = useState<ScanHistoryRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  useEffect(() => { void listScanHistory().then(setScans).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Scan history could not be loaded.')); }, []);
  const filtered = scans.filter((scan) => `${scan.id} ${scan.source} ${scan.status} ${scan.error_message ?? ''}`.toLowerCase().includes(search.toLowerCase())).filter((scan) => status === 'all' || scan.status === status);
  const exportScans = () => downloadCsv('ransomshield-scan-history.csv', recordsToCsv(['id', 'created_at', 'source', 'status', 'prediction', 'confidence', 'model_version', 'error_message'], filtered.map((scan) => scan as unknown as Record<string, unknown>)));
  const removeScan = async (id: string) => { if (!window.confirm('Delete this scan history record?')) return; try { await deleteScanRecord(id); setScans(scans.filter((scan) => scan.id !== id)); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Scan could not be deleted.'); } };
  return <PageScaffold overline="Audit trail" title="Scan history" description="Search and review stored prediction requests once persistence is connected.">{error && <div className="inline-message error"><AlertCircle size={16} /> {error}</div>}<div className="toolbar panel"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search scan ID or source..." /></div><select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="not_connected">Not connected</option><option value="completed">Completed</option><option value="failed">Failed</option></select><button className="button ghost" onClick={exportScans}><Download size={15} /> Export</button></div>{filtered.length ? <div className="panel records-table scan-history-table"><div className="scan-history-row scan-history-header"><span>Scan ID</span><span>Created</span><span>Status</span><span>Prediction</span><span>Actions</span></div>{filtered.map((scan) => <div className="scan-history-row" key={scan.id}><span><strong>{scan.id.slice(0, 8)}</strong><small>{scan.source}</small></span><span>{new Date(scan.created_at).toLocaleString()}</span><span className="status-tag neutral">{scan.status}</span><span>{scan.prediction ?? '—'}</span><button className="icon-button danger" onClick={() => void removeScan(scan.id)} aria-label="Delete scan record"><TrashIcon size={14} /></button></div>)}</div> : <EmptyTable icon={<History size={21} />} title="No scan history yet" description="Completed requests and their prediction status will appear here." />}</PageScaffold>; }
function Reports() { return <PageScaffold overline="Research outputs" title="Reports" description="Generate clear, evidence-based summaries from stored scans and verified evaluation results."><div className="report-grid"><InfoCard title="Evaluation report" icon={<FileBarChart size={18} />} status="Unavailable" text="Generate this report after a connected model produces genuine held-out test metrics." action="Create report" /><InfoCard title="Dataset summary" icon={<FileSpreadsheet size={18} />} status="Awaiting data" text="Summarize imported records, schemas, labels, and validation outcomes." action="Create report" /></div><div className="panel report-note"><div className="safety-icon"><FileCode2 size={16} /></div><div><strong>Academic integrity guardrail</strong><p>Reports will label sample previews, planned components, and actual results separately so no unverified metric is presented as a finding.</p></div></div></PageScaffold>; }
function SettingsPage() {
  const [backendUrl, setBackendUrl] = useState('');
  const [healthPath, setHealthPath] = useState('/health');
  const [predictPath, setPredictPath] = useState('/predict');
  const [status, setStatus] = useState('Not configured');
  const [error, setError] = useState('');
  useEffect(() => { void getSetting('backend_connection').then((value) => { if (!value) return; setBackendUrl(String(value.url ?? '')); setHealthPath(String(value.healthPath ?? '/health')); setPredictPath(String(value.predictPath ?? '/predict')); setStatus('Saved'); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Settings could not be loaded.')); }, []);
  const saveConnection = async () => { if (!backendUrl.trim()) { setError('Enter a backend URL before saving.'); return; } setError(''); try { await saveSetting('backend_connection', { url: backendUrl.trim(), healthPath: healthPath.trim() || '/health', predictPath: predictPath.trim() || '/predict' }); setStatus('Saved'); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Settings could not be saved.'); } };
  return <PageScaffold overline="Workspace configuration" title="Settings" description="Connect the planned Python service and choose how this research workspace should behave.">{error && <div className="inline-message error"><AlertCircle size={16} /> {error}</div>}<div className="settings-layout"><div className="panel settings-panel"><div className="panel-heading"><div><h3>Detection backend</h3><p>Connection details for your separate Flask service.</p></div><span className={`status-tag ${status === 'Saved' ? 'planned' : 'neutral'}`}>{status}</span></div><div className="field"><label>Backend URL</label><input value={backendUrl} onChange={(event) => { setBackendUrl(event.target.value); setStatus('Not saved'); }} placeholder="https://your-python-service.example/api" /></div><div className="field"><label>Health endpoint</label><input value={healthPath} onChange={(event) => setHealthPath(event.target.value)} placeholder="/health" /></div><div className="field"><label>Prediction endpoint</label><input value={predictPath} onChange={(event) => setPredictPath(event.target.value)} placeholder="/predict" /></div><button className="button primary" onClick={() => void saveConnection}><Check size={15} /> Save connection</button></div><div className="panel settings-panel"><div className="panel-heading"><div><h3>Application preferences</h3><p>Safe defaults for a research prototype.</p></div><SlidersHorizontal size={18} className="muted-icon" /></div><ToggleRow title="Show sample data labels" description="Keep previews clearly marked as sample-only." enabled /><ToggleRow title="Require confirmation before deletion" description="Ask before removing stored records." enabled /><ToggleRow title="Enable notification sounds" description="Play sounds for completed scans." /></div></div></PageScaffold>; }

function PageScaffold({ overline, title, description, action, children }: { overline: string; title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) { return <><section className="page-intro"><div><div className="overline">{overline}</div><h2>{title}</h2><p>{description}</p></div>{action}</section><div className="page-stack">{children}</div></>; }
function MetricCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) { return <div className={`metric-card tone-${tone}`}><div className="metric-icon">{icon}</div><span className="metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) { return <div className="panel-heading"><div><h3>{title}</h3><p>{subtitle}</p></div>{action}</div>; }
function ReadinessItem({ label, done, detail }: { label: string; done?: boolean; detail?: string }) { return <div className="readiness-item"><span className={`check-icon ${done ? 'done' : ''}`}>{done ? <Check size={12} /> : <span />}</span><span>{label}</span><small>{done ? 'Ready' : detail}</small></div>; }
function Field({ label, placeholder, disabled }: { label: string; placeholder: string; disabled?: boolean }) { return <div className="field"><label>{label}</label><input placeholder={placeholder} disabled={disabled} /></div>; }
function RecordEditor({ record, values, headers, onChange, onCancel, onSave, busy }: { record: DatasetRecord | null; values: Record<string, string>; headers: string[]; onChange: (values: Record<string, string>) => void; onCancel: () => void; onSave: () => void; busy: boolean }) { return <div className="panel record-editor"><div className="panel-heading"><div><h3>{record ? `Edit record ${record.row_number}` : 'Add dataset record'}</h3><p>Values are stored exactly as entered; no feature is executed.</p></div><button className="icon-button" onClick={onCancel} aria-label="Close record editor"><X size={15} /></button></div><div className="field-grid">{headers.map((header) => <div className="field" key={header}><label>{header}</label><input value={values[header] ?? ''} onChange={(event) => onChange({ ...values, [header]: event.target.value })} /></div>)}</div><div className="form-actions"><button className="button secondary" onClick={onCancel}>Cancel</button><button className="button primary" disabled={busy} onClick={onSave}><Check size={15} /> {busy ? 'Saving…' : 'Save record'}</button></div></div>; }
function EmptyTable({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) { return <div className="panel empty-table"><div className="empty-table-icon">{icon}</div><h3>{title}</h3><p>{description}</p></div>; }
function InfoCard({ title, icon, status, text, action }: { title: string; icon: React.ReactNode; status: string; text: string; action: string }) { return <div className="panel info-card"><div className="info-card-top"><div className="card-icon">{icon}</div><span className={`status-tag ${status === 'Planned' ? 'planned' : 'neutral'}`}>{status}</span></div><h3>{title}</h3><p>{text}</p><button className="text-button">{action} <ArrowUpRight size={14} /></button></div>; }
function ToggleRow({ title, description, enabled }: { title: string; description: string; enabled?: boolean }) { const [active, setActive] = useState(Boolean(enabled)); return <div className="toggle-row"><div><strong>{title}</strong><p>{description}</p></div><button className={`toggle ${active ? 'on' : ''}`} onClick={() => setActive(!active)} aria-label={`Toggle ${title}`}><span /></button></div>; }
function MoreDots() { return <div className="more-dots"><span /><span /><span /></div>; }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><strong>{label}</strong><span>{payload[0].value} scans</span></div>; }

export default App;
