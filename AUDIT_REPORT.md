# MuleTrace engineering audit and delivery report

**Audit date:** 2026-10-03  
**Repository supplied:** Next.js frontend archive (`MuleTrace.zip`)  
**Disposition:** Functional full-stack local platform implemented and verified, including a full synthetic-data-to-local-EVM test. This is not a real-data model evaluation or a live/public blockchain deployment.

## Starting condition

The archive contained a Next.js UI, shared TypeScript shapes, and deterministic mock data only. It had no API server, database, real dataset files, ML model, authentication service, or Solidity project. The interface contained simulated uploads and synthetic seeded cases. I retained the dashboard, investigation graph/timeline, Urbanist typography, Celery/Fluorescent Mint visual system and added real API/data surfaces rather than replacing the UI.

## Implemented

- **Real application/API:** FastAPI + SQLite/WAL and foreign keys; same-origin Next.js server proxy; real API mode and honest empty states; provenance, investigations, decision audit records and event logging. Added Dataset Manager, Model Analytics, Cross-source Intelligence and blockchain/audit surfaces.
- **Source-aware imports:** Three independent Kaggle profiles; header mapping; UTF-8/CSV/amount validation; normalized labels; source-scoped exact-row deduplication; limits; original headers, source, uploader and file SHA-256 provenance. Unknown/missing identifiers, dates, labels, currencies and fields stay missing; no synthetic values, implied USD, date conversion or unauthorized joins. Cross-source candidate matching uses HMAC fingerprints and never exposes raw account IDs.
- **Fraud engine:** Class-balanced Random Forest with stratified out-of-fold predictions when both label classes and sufficient rows exist; IsolationForest anomaly scoring for unlabeled/partially labeled transactions; transparent amount/fan-in/fan-out rules. Labels are not copied into scores; PaySim leakage-adjacent fields are excluded. Per-alert explanations are capped and explain model/rule evidence. Predictions remain distinct from human-confirmed case decisions.
- **Evaluation/versioning:** API/UI now report precision, recall, F1, PR-AUC, **ROC-AUC**, and confusion matrices only when valid evaluation is available. Each import gets a SHA-256 training-run manifest version covering source-file commitment, mapped schema, model configuration and library versions. Fitted estimator bundles are persisted off-API/off-chain with owner-only `0700` directory/`0600` file permissions and content SHA-256; that artifact hash is included in the manifest commitment when persistence succeeds. A configurable size cap records `omitted_size_limit` rather than claiming unavailable artifacts.
- **Solidity registry:** Added `MuleTraceAuditRegistry` with owner-managed authorized writers, separate duplicate-protected functions and events for audit and model-version commitments, and public independent read verification. Only SHA-256 digests go on-chain; transaction and customer rows/model artifacts remain off-chain. The admin-only model-version anchor API records pending transaction hashes and offers independent verification. EVM receipt polling retries do not rebroadcast; configured confirmation depth is required before verified status.
- **Testnet path:** Added an opt-in Hardhat deployment script/config which requires explicit testnet declaration and acknowledgment, chain-ID match, and refuses known mainnet/local chain IDs. It was not run against a public network.
- **Security baseline:** Production token and HMAC configuration gates; role enforcement (analyst/admin; only admin may anchor model hashes); same-origin mutation check; input validation; owner-only database/WAL and model artifact permissions; secrets excluded from browser bundles and ignored local state excluded from the repository archive.

## Verification performed

- `python3 -m unittest discover -s backend/tests -v` — **13 tests passed**, covering ingestion, schema/label behavior, label-leakage controls, anomaly-only scoring, artifact SHA-256/file permissions, ROC-AUC, model-anchor RBAC/fail-closed behavior, EVM confirmation depth, off-chain audit tamper detection and redacted cross-source matching.
- `npm run typecheck` — **passed**.
- `npm run build` — **passed**; production build includes dashboard, alerts, investigations, audit, datasets, cross-source intelligence, model analytics and backend proxy routes.
- `CI=1 npx hardhat test` — **5 Solidity tests passed** for audit/model anchors, read verification, authorization, zero/duplicate protection and owner-controlled roles. `node --check scripts/deploy.js` — **passed**.
- **Full synthetic end-to-end chain check — passed on an ephemeral local Hardhat network (chain ID 31337 only):** uploaded 80 generated fixture rows, trained and persisted an estimator bundle, anchored and independently verified the model-run hash, made a human review decision, anchored the audit digest, recomputed the off-chain hash and verified the receipt/event/contract storage independently. Both model and audit commitments returned `verified`. The local RPC was stopped afterward. This is not a public-chain transaction or dataset performance result.
- Earlier API/proxy smoke testing verified health, empty-state data, live frontend delivery, same-origin proxy reads and rejection of cross-origin mutations. No synthetic metrics were presented as real system activity.

## Remaining blockers before production

1. **Real data:** Kaggle files/credentials were not supplied in the archive or environment, so the actual datasets have not been downloaded or evaluated. The PaySim file may exceed the default 200 MiB upload cap; large-scale processing should move to streaming/background jobs. The Yogesh source schema may need explicitly approved joins; the uploader will not invent them. Confirm Thuandao headers using the actual authorized file.
2. **Public EVM:** No external RPC, deployed contract, funded testnet signer or approval to send a public-chain transaction was supplied. Deployment and public-chain anchoring remain unperformed. Deploy the new registry, authorize the backend signer, and configure secrets before using those APIs. Do not use the local Hardhat test address as a deployment.
3. **Identity/operations:** Bearer-token role mapping is implemented but there is no end-user login/session or identity provisioning UI; server-side service tokens do not provide named-user identity. Before exposure, configure TLS, secret manager, rate limiting, managed backups, retention, log redaction, encrypted persistent storage and monitoring.
4. **Artifact/data-at-rest:** Local artifacts/databases are owner-only, not encrypted by the application. Use encrypted host/volume or managed storage and key protection. No artifact-download/inference endpoint is exposed; stored bundles serve provenance/versioning, not a production model-serving SLA.
5. **ML governance:** The baseline needs real source data, temporal/customer-level validation where appropriate, alert-threshold cost tuning, drift/fairness/calibration checks and reviewer validation. Scores do not establish fraud. Cross-source fingerprint overlap is not identity resolution.

See `README.md` for setup, dataset profile notes, test commands, deployment gates and environment variables. No real-world fraud prevalence or model-performance claim is made.
