# RansomShield AI
### AI-Powered Ransomware Detection & Analytics Platform

RansomShield AI is an academic project exploring a defensive approach to ransomware detection. The project is intended to provide a dashboard for managing datasets, reviewing scan history, tracking model metadata, and presenting evaluation information as the detection pipeline is developed.

> **Development status:** The current repository contains the React dashboard and Supabase persistence scaffolding. A trained detection model and a connected Python inference API are **not yet included**, so the interface must not be treated as a working malware detector. Do not interpret placeholder or demo content as measured model performance.

## Project objective

The project investigates a hybrid deep-learning approach for classifying records as **Benign** or **Ransomware**. The proposed design is:

- **MLP branch:** processes static, tabular executable features.
- **BiLSTM branch:** processes ordered behavioral sequences, if a compatible dataset is available.
- **Feature fusion and classifier:** combines branch representations for the final classification.

The sequence branch should only be built when genuine ordered behavioral data can be aligned with the corresponding static-feature records. No behavioral sequences or evaluation results should be fabricated.

## Current features

The frontend currently provides pages for:

- Dashboard
- Detection Scanner
- Dataset Management
- Model Management
- Evaluation
- Scan History
- Reports
- Settings

The repository also includes CSV/repository helper code, tests, and a Supabase SQL migration for persistence. The presence of a UI page does not mean its full end-to-end workflow is connected to a real model.

## Technology stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Charts and icons:** Recharts, Lucide React
- **Persistence layer:** Supabase JavaScript client and SQL migration
- **Planned ML/backend work:** Python, pandas, NumPy, scikit-learn, and PyTorch or TensorFlow; a Python API (for example, Flask) will be needed to serve real model predictions.

## Run locally

### Requirements

- Node.js and npm
- A Supabase project only if you want to configure the persistence integration

### 1. Clone the repository

```bash
git clone https://github.com/Lakshyagour1503/RansomShield-AI.git
cd RansomShield-AI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Supabase (optional)

Create a `.env` file in the project root if using Supabase:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never commit private service-role keys, passwords, or other secrets. The browser-facing anon key is not a substitute for correctly configured database permissions.

The migration is located at:

```
supabase/migrations/20261029043404_create_ransomshield_persistence.sql
```

Review the migration and your Row Level Security (RLS) policies before connecting a public deployment. The current policies are intended for prototype development and should not be assumed safe for production or sensitive data.

### 4. Start the development server

```bash
npm run dev
```

Vite will print the local URL in the terminal.

## Available project scripts

Run these commands locally to check the project; results have not been certified by this README.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the frontend for production |
| `npm run preview` | Preview a production build locally |
| `npm run typecheck` | Run the TypeScript check |
| `npm test` | Run Vitest tests |
| `npm run lint` | Run ESLint |

## Development roadmap

1. **Confirm the dataset:** identify a legitimate, documented, labelled dataset and verify its licence, feature definitions, and label meanings.
2. **Prepare the data:** handle missing values, duplicates, categorical features, scaling, class imbalance, and train/validation/test splits without data leakage.
3. **Establish a baseline:** train and evaluate a simple baseline and an MLP using reproducible scripts.
4. **Assess sequence feasibility:** add the BiLSTM and fusion only if authentic ordered sequences are available and aligned with the static records.
5. **Evaluate honestly:** report precision, recall, F1-score, confusion matrix, and other suitable metrics from actual held-out test runs. Record dataset versions, model versions, and experiment settings.
6. **Connect inference:** implement a Python API and connect the scanner UI to real predictions, with clear validation and error handling.
7. **Verify persistence and security:** test dataset imports, scan history, model metadata, and RLS policies; add authentication/authorization if needed.
8. **Document and demonstrate:** add screenshots of the running app and evidence from completed tests and experiments.

## Safety and responsible use

- This project is for defensive cybersecurity research and education.
- Do not run unknown or suspected malware on your everyday machine. Use approved, isolated analysis environments and follow your institution's safety procedures.
- Treat predictions as decision support, not proof that a file is safe or malicious.
- Do not upload confidential, personal, or proprietary files to a demo or untrusted service.
- Clearly distinguish sample data, placeholder interface values, and real model outputs.

## Limitations

- A trained MLP/BiLSTM hybrid model and inference service are not currently included in this repository.
- Real prediction and evaluation results must be generated by running a documented training/evaluation pipeline.
- Supabase persistence depends on valid project credentials, schema setup, and appropriate access policies.
- Build, type-check, lint, and test commands should be run before submission or deployment.

## Academic project

**Project title:** Intelligent Ransomware Detection Using Hybrid Deep Learning  
**Platform name:** RansomShield AI — AI-Powered Ransomware Detection & Analytics Platform

This README describes the repository's current development status and proposed direction. Update it as the model, backend, experiments, and deployment are implemented and verified.
