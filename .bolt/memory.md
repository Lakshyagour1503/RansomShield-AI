# Project memory

## Product intent & audience

- **RansomShield AI — Intelligent Ransomware Detection & Analytics Platform**: interactive cybersecurity dashboard for ransomware detection and analytics.
- Audience: academic evaluators (B.Tech CSE major project); defensive cybersecurity use only.
- Core modules: dataset management, detection scanner, model configuration, evaluation metrics, scan history, reports, settings.
- Planned ML architecture: hybrid deep-learning — MLP for static/tabular features + BiLSTM for sequential behavioral features. Model is **not yet trained**.
- ML backend is a separate Python Flask service (Pandas, Scikit-learn, PyTorch); Node.js backend exposes a REST API and must stay modular so the real Python backend can connect later.

## Brand personality & voice

- Professional, academic-project presentation quality.
- Trustworthy and precise: never overstates capabilities; clearly distinguishes genuine results from samples/demo.
- Defensive, safety-conscious tone throughout.

## Visual design & UX direction

- Dark navy background with professional blue/cyan accents.
- Sidebar navigation + clean top navigation bar.
- Reusable layout pieces: cards, charts (Recharts), tables, filters, loading/empty/error states.
- Lucide React icons used for logos and UI iconography.
- Responsive across desktop and mobile.
- Status states shown explicitly: “Not trained,” “Awaiting dataset,” “Backend not connected,” “Sample data.”
- Sample data allowed for UI previews only and must be labeled as sample data.
- Avoid decorative-only mockups; build toward working features.

## Decisions, constraints & rationale

- Stack: Vite + React + TypeScript + Tailwind CSS; Recharts for charts; Lucide React for icons; Node.js REST backend; SQLite (or compatible persistent DB) for persistence.
- Import project modules via `@/` path alias (`@/` → `src/`).
- Do not install extra UI/icon packages unless explicitly requested.
- Do not invent accuracy/precision/recall/F1/training results; do not claim the hybrid model is trained.
- Implement MLP baseline only with genuine labeled data; BiLSTM/hybrid fusion only with real aligned behavioral sequences. Never fabricate sequences or dataset records.
- Never execute uploaded executables or ransomware.
- Persistence must use the database, not temporary frontend state only.
- Every button/form/filter/navigation/table action must work.
- Development staged to conserve free-plan credits:
  - Stage 1 (done): frontend shell, navigation, responsive layouts, all page views with explicit “awaiting backend” states. Builds and passes type/lint checks.
  - Stage 2 (next): database persistence, dataset CRUD, CSV validation, scan history.
  - Stage 3: scanner API interface, backend status, model management, report exports.
  - Stage 4: evaluation visualizations + connect real Python ML backend when available.
  - Stage 5: tests, fixes, verification, setup docs + example env config (no real secrets).
- Preserve existing working functionality when adding later stages.

## Open questions & assumptions

- SQLite availability on the Bolt Node.js backend assumed; fallback to a compatible persistent DB needed if not supported.
- Schema for feature records and behavioral sequences still to be finalized with the Python backend contract.
- Actual labeled dataset not yet provided — evaluation page must stay non-fabricated until genuine results exist.
- Python Flask backend endpoints and payload formats TBD in Stage 4.