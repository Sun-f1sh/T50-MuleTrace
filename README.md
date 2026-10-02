# MuleTrace

**Local-first fraud triage and investigation workspace**

MuleTrace helps analysts import transaction data, surface suspicious activity, investigate alerts, document human decisions, and verify an audit trail. It combines source-aware CSV ingestion, transparent rules, ML-assisted signals, cross-source candidate matching, and SHA-256 audit commitments.

> **Prototype status:** MuleTrace is a research/demo prototype, not a production fraud-decision system. Scores are triage signals—not proof of fraud. Human review is required. No live blockchain deployment or real-world performance evaluation is included by default.

## What it does

- **Import:** Upload CSV files and map supported source schemas while preserving provenance and file hashes.
- **Detect:** Combine transparent batch rules with supervised or anomaly-based model signals when the data supports them.
- **Investigate:** Review alerts, inspect available evidence, and record analyst decisions.
- **Connect:** Surface potential cross-source links using keyed HMAC-SHA-256 fingerprints; matches are candidates, not identity assertions.
- **Audit:** Create SHA-256 commitments for run manifests and decisions, with optional testnet anchoring.
- **Admin:** Inspect dashboard metrics, model/detection information, and operational activity available in the prototype.

## Architecture

| Path | Responsibility |
|---|---|
| `frontend/` | Next.js 15 / React dashboard and same-origin backend proxy |
| `frontend/src/app/(app)/` | Application routes, including alerts, investigations, audit, and admin |
| `backend/main.py` | FastAPI API, SQLite storage, ingestion, feature extraction, scoring, and audit logic |
| `backend/tests/` | Backend integration tests using temporary databases and synthetic fixtures |
| `muletrace-contracts/` | Solidity audit registry and Hardhat tests for optional EVM anchoring |

## Quick start

You need Python 3.10+ (use a version compatible with the pinned backend dependencies), Node.js/npm, and a terminal. Run the backend and frontend in separate terminals.

### 1. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

The API listens locally on `http://127.0.0.1:8000`.

### 2. Start the frontend

From the repository root, open a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Next.js (typically `http://localhost:3000`). The frontend proxy defaults to `http://127.0.0.1:8000`.

If your API runs elsewhere, set `MULETRACE_BACKEND_URL` in the **Next.js server environment** before starting the frontend. Do not use a `NEXT_PUBLIC_` variable for secrets.

## Demo workflow

1. Open the dataset/import area and upload a supported CSV.
2. Confirm the detected source profile and mapped fields; review import results.
3. Open the generated alerts and inspect the available features and explanations.
4. Open an investigation, review evidence, and record a human decision.
5. Visit the audit view to inspect the commitment and its verification status.
6. If demonstrating cross-source intelligence, import two datasets and present matches as *potential links* requiring analyst review.

Use synthetic or approved demo data. Do not upload real customer/bank data into an unapproved environment.

## Dataset support and data handling

The dataset manager includes profiles for three external Kaggle sources: Eedala/PaySim, Thuandao, and Yogesh Tekawade. The datasets are **not bundled**; obtain them through the appropriate source and check their licenses and terms before use.

- PaySim mapping recognizes fields such as `step`, `type`, `amount`, `nameOrig`, `nameDest`, and `isFraud`. Balance-before/after and `isFlaggedFraud` are excluded from predictive features because of leakage/label-adjacent concerns.
- Thuandao mapping uses known aliases for common transaction/account/amount/date/fraud fields. Only present headers are mapped; unknown fields are not assumed.
- Yogesh Tekawade mapping recognizes transaction/customer/amount/account/investment/date fields. If no fraud label is present, that import is treated as unlabeled.

The uploader requires an amount field. Missing IDs, timestamps, counterparties, labels, and currencies are not fabricated. Unknown-currency amounts remain in their original units, and mixed currencies are not silently summed. PaySim `step` is treated as a relative step, not a calendar timestamp. Exact repeated rows within a source profile are skipped.

Default upload limits are 200 MiB and 250,000 rows. Configure `MULETRACE_MAX_UPLOAD_BYTES` and `MULETRACE_MAX_ROWS` only after considering available memory and disk. Large datasets may need filtering or partitioning; required side-table joins must be prepared in an approved analytical pipeline.

## Models and interpretation

When a labeled batch has at least 20 usable rows and both classes, the backend can train/evaluate a class-balanced Random Forest using stratified out-of-fold predictions. Unlabeled or insufficient batches are not reported as evaluated. Available metrics can include precision, recall, F1, PR-AUC, ROC-AUC, and a confusion matrix when evaluation is applicable.

Signals may combine model outputs (Random Forest probability or IsolationForest anomaly percentile) with batch-level rules, including robust amount outliers and observed fan-in/fan-out. Explanations provide feature context; they are not causal explanations. Treat every score as a prioritization aid. Only a human decision changes an investigation to `confirmed` or `cleared`.

Each import receives a version ID and a SHA-256 commitment to a canonical run manifest, including source-file hash, mapped schema, feature names, library versions, model configuration, and estimator artifact hash/status. Model artifacts are stored off API/off-chain and are not served by an API route. Configure encrypted host storage and managed key protection before any operational use.

## Audit and optional blockchain

Decision payloads are canonicalized and hashed with SHA-256. Raw transaction/customer evidence and model artifacts remain off-chain. The optional Web3 client can submit an investigation digest or a separately typed model-version digest when the required EVM settings are configured.

**Blockchain is not live by default.** This repository does not include a deployed contract, configured RPC, or wallet. Until a testnet deployment is configured and independently verified, describe the feature as optional/local audit commitments—not as a live on-chain system.

For an intentional testnet deployment, configure the testnet RPC, chain ID, deployer key, and explicit acknowledgment in your environment, then follow the deployment script in `muletrace-contracts/`. Never commit private keys or RPC credentials. After deployment, configure the registry address and authorize the API signer from the registry owner account.

## Configuration and security

Relevant environment settings include:

| Variable | Purpose |
|---|---|
| `MULETRACE_BACKEND_URL` | Frontend server-side proxy target (default `http://127.0.0.1:8000`) |
| `MULETRACE_DB` | SQLite database path |
| `MULETRACE_API_TOKENS` | Backend bearer-token role mapping; required for production |
| `MULETRACE_API_TOKEN` | Token injected by the Next.js server proxy when configured |
| `MULETRACE_FINGERPRINT_SECRET` | Stable secret for cross-source keyed fingerprints; set before imports in production |
| `MULETRACE_MODEL_DIR` | Model artifact directory |
| `MULETRACE_MAX_UPLOAD_BYTES` / `MULETRACE_MAX_ROWS` | Upload limits |
| `MULETRACE_EVM_RPC_URL`, `MULETRACE_AUDIT_CONTRACT`, `MULETRACE_EVM_PRIVATE_KEY` | Optional EVM configuration; keep secrets in a secret manager |

Development mode may allow a local analyst without a token to simplify setup. **Do not expose this mode publicly.** Production requires configured bearer-token role mapping. The prototype does not include password login, user provisioning UI, retention controls, encrypted SQLite-at-rest, or complete production operations hardening. Before real use, add TLS, restrictive CORS, secret management, backups, log redaction, encrypted storage, access reviews, and documented reviewer procedures.

Keep `.env` and local databases/uploads out of Git. Commit a sanitized `.env.example` only if you create one; never put real tokens, keys, customer data, or private datasets in it.

## Tests and validation

Run commands from the repository root unless a `cd` is shown.

```bash
# Backend tests
cd backend
python3 -m unittest discover -s tests -v
cd ..

# Frontend checks
cd frontend
npm ci
npm run typecheck
npm run build
cd ..

# Smart-contract tests (optional)
cd muletrace-contracts
npm ci
npm test
```

Backend tests use isolated temporary SQLite databases and synthetic fixtures. Contract tests run on a local Hardhat EVM. Passing tests demonstrate tested functionality only; they do not establish fraud-detection accuracy, production readiness, or performance on the external datasets.

## Known limitations

- External Kaggle datasets are not included and must be obtained/licensed separately.
- No real-world business evaluation, calibrated operating threshold, drift study, or fairness assessment is claimed.
- Cross-source fingerprint matches are potential candidates and can collide; they are not proof that records belong to the same person/entity.
- The optional EVM integration requires a separately configured testnet deployment and credentials.
- Production authentication, encrypted-at-rest storage, retention, and operational controls need further implementation.

## Project status

MuleTrace is intended for demonstration, experimentation, and further development. For a presentation, distinguish implemented local functionality from optional/unconfigured integrations and show the complete import → alert → investigation → decision → audit flow.
