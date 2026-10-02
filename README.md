# MuleTrace

MuleTrace is a local-first fraud triage application: CSV ingestion, source-aware schema mapping, transparent rules and ML-assisted scores, human review, and SHA-256 audit commitments with an optional EVM anchor. It preserves the supplied Next.js dashboard, Urbanist type, Celery and Fluorescent Mint visual system.

## Architecture

- `src/`: Next.js 15 frontend. Existing case, graph, timeline, alert, decision and audit components remain in place.
- `src/app/backend/[...path]/route.ts`: same-origin server proxy. Browser traffic goes to `/backend/api/...`; backend secrets are not bundled in the browser.
- `backend/main.py`: FastAPI API, SQLite (WAL, foreign keys, owner-only database/sidecar permissions), CSV pipelines, deduplication, feature extraction, model evaluation/versioning and audit verification.
- `muletrace-contracts/contracts/MuleTraceAudit.sol`: `MuleTraceAuditRegistry`, owner-managed auditor authorization, separate append-only audit/model-version commitment methods. Only 32-byte SHA-256 commitments go on-chain.

## Run locally

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

In another terminal:

```bash
npm ci
npm run dev
```

The frontend's same-origin proxy defaults to `http://127.0.0.1:8000`. Override `MULETRACE_BACKEND_URL` on the Next.js server if the API is elsewhere. Backend state is in `backend/muletrace.sqlite3`; set `MULETRACE_DB` to move it. `npm run build` and `npm run typecheck` validate the frontend.

## Dataset integration and data integrity

The dataset manager offers independent profiles for the three requested Kaggle sources. Download each CSV using your Kaggle account and upload it; this repository does not contain the datasets, Kaggle credentials, or a fabricated download. Uploads retain source URL, original headers, file SHA-256, uploader, row hashes, import counts, and source profile. Cross-source candidates compare keyed HMAC-SHA-256 identifier fingerprints only; matches are explicitly potential collisions, not identity assertions. The endpoint never returns raw IDs. In development the fingerprint key is generated next to the SQLite file with owner-only permissions; in production set and back up `MULETRACE_FINGERPRINT_SECRET` in a secret manager before imports. Exact repeated rows already ingested under a source profile are skipped. Amount is required. Missing IDs, timestamps, counterparties, labels, and currencies remain absent; they are not invented. Unknown-currency amounts remain labeled as units; mixed currencies are not silently summed. PaySim step is shown as a relative step, not converted to a calendar date. Non-UTF-8, malformed, over-limit and unrecognized files fail with an API error.

- **Eedala / PaySim:** recognizes `step`, `type`, `amount`, `nameOrig`, `nameDest`, `isFraud`. Balance-before/after and `isFlaggedFraud` are excluded from predictive features due to leakage/label-adjacent concerns documented by the source.
- **Thuandao:** independent aliases for common transaction/account/amount/date/fraud headers. The public dataset page did not provide a complete schema in this implementation environment; only actual headers are mapped and unknown columns are not assumed.
- **Yogesh Tekawade:** recognizes transaction, customer, amount, account/investment type and date headers. Its documented transaction schema does not contain a fraud label, so that profile remains unsupervised unless an uploaded CSV actually contains a label field.

The current CSV API has configurable size and row caps (`MULETRACE_MAX_UPLOAD_BYTES`, default 200 MiB; `MULETRACE_MAX_ROWS`, default 250,000). Kaggle’s PaySim file can exceed this limit; use a filtered/partitioned CSV for this prototype or increase limits only after provisioning adequate memory and disk. Customer/business/bank side tables need pre-join in an approved analytical pipeline; the single-file uploader does not fabricate joins.

## Models, evaluation and versioning

Labeled batches with at least 20 usable rows and both label classes train/evaluate a class-balanced Random Forest with stratified out-of-fold predictions. The analytics API reports precision, recall, F1, PR-AUC, ROC-AUC and confusion matrix only when evaluation is applicable; unlabeled/low-count imports remain unevaluated. Amount-derived features/rules are normalized per observed currency. Scores combine Random Forest probability or IsolationForest anomaly percentile with transparent batch rules such as robust amount outliers and observed fan-in/fan-out. Supervised case explanations use held-out leave-one-feature-out perturbations; anomaly explanations show feature-deviation context and are explicitly non-causal. Explanations are capped to the 200 highest-risk rows per import by default (`MULETRACE_MAX_ATTRIBUTIONS`). Predictions remain predictions; only a human decision changes an investigation to `confirmed` or `cleared`.

Every import receives a version ID and SHA-256 commitment to a canonical run manifest (source-file hash, mapped schema, feature names, library versions, model configuration and estimator-artifact hash/status). Trained scikit-learn estimator bundles are saved off API/off-chain under an owner-only directory (default beside the SQLite database, override with `MULETRACE_MODEL_DIR`), mode `0700` directory/`0600` files. The per-artifact limit defaults to 50 MiB (`MULETRACE_MAX_MODEL_ARTIFACT_BYTES`); if persistence fails or exceeds the cap, the run still records an honest manifest with the artifact status, but does not claim an artifact hash. Artifact files are ignored from Git and never served by an API route. Configure encrypted host storage and managed key protection before production.

## Blockchain and audit

Decision payloads are canonicalized using sorted JSON and SHA-256 hashed. Raw transaction/customer evidence and model artifacts stay off-chain. The optional Web3 client broadcasts an investigation digest or separately typed model-version digest only when `MULETRACE_EVM_RPC_URL`, `MULETRACE_AUDIT_CONTRACT`, and `MULETRACE_EVM_PRIVATE_KEY` are configured. The admin-only model hash anchor API records the transaction; independent verification checks the receipt, expected chain/block, event digest and contract storage. Audit/model commitments are never reported `verified` until the receipt succeeds, the digest is independently present on-chain, and `MULETRACE_EVM_CONFIRMATIONS` (default 1) has been met. `MULETRACE_EVM_RETRIES` (default 2) retries receipt polling only; it never rebroadcasts a transaction. Pending hashes are retained for later verification.

Deploy the registry only after explicitly configuring a testnet RPC, chain ID and deployer key; deployment is guarded against mainnet/local IDs and requires an explicit acknowledgment:

```bash
export MULETRACE_NETWORK_KIND=testnet
export MULETRACE_TESTNET_DEPLOY_ACK=I_CONFIRM_TESTNET_DEPLOYMENT
export MULETRACE_EVM_RPC_URL=...              # testnet RPC
export MULETRACE_CHAIN_ID=...                 # must match the RPC
export MULETRACE_EVM_PRIVATE_KEY=...          # secret manager/environment only
cd muletrace-contracts && npm ci
npm run deploy:testnet
```

Copy the reported registry address and chain ID into the backend environment, authorize the API signer with `setAuthorized(address,true)` from the registry owner, and configure a secret manager. No live deployment or on-chain transaction is performed by the test suite.

## Security status and limitations

- API supports bearer-token role mapping via `MULETRACE_API_TOKENS='{"analyst":"...","admin":"..."}'`; production refuses to start without it. Development defaults to an open local analyst to keep the initial local setup usable. Do not expose that mode publicly.
- The Next.js proxy injects server-side `MULETRACE_API_TOKEN` (never `NEXT_PUBLIC_*`) when configured. Set backend `MULETRACE_API_TOKENS` and proxy token consistently. Use a reverse proxy/TLS, secret manager, restrictive CORS, backups, log redaction and database-at-rest encryption before production.
- `analyst` and `admin` may decide cases; only `admin` may submit model-version anchor transactions. No dedicated user-management UI, account provisioning workflow, password login, retention policy, encrypted SQLite-at-rest layer, or production ops hardening is included.
- Validate source licenses, sampling strategy, thresholds, drift, fairness and reviewer procedures before operational use. These scores do not establish fraud. No linked Kaggle dataset was downloaded in this environment, so only synthetic test fixtures were available for functional tests—not business evaluation or dataset-specific claims.
- No EVM RPC, deployed contract, or wallet was configured for this task. No deployment or live transaction was made. Blockchain views therefore remain truthful about the unconfigured state until a testnet deployment and credentials are supplied.

## Test

```bash
cd backend && python3 -m unittest discover -s tests -v
cd .. && npm run typecheck && npm run build
cd muletrace-contracts && npm test
```

Backend integration tests use isolated temporary SQLite and synthetic fixtures; they verify functionality only and do not represent production performance. Solidity tests execute on the local Hardhat EVM.
