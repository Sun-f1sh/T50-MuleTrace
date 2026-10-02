from __future__ import annotations

import csv
import fcntl
import hashlib
import io
import json
import math
import os
import pickle
import tempfile
import re
import sqlite3
import statistics
import time
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("MULETRACE_DB", str(ROOT / "muletrace.sqlite3")))
MAX_UPLOAD_BYTES = int(os.getenv("MULETRACE_MAX_UPLOAD_BYTES", str(200 * 1024 * 1024)))
MAX_ROWS = int(os.getenv("MULETRACE_MAX_ROWS", "250000"))
APP_ENV = os.getenv("MULETRACE_ENV", "development")

DATASETS: dict[str, dict[str, Any]] = {
    "paysim": {
        "id": "paysim", "name": "Financial Fraud Detection Dataset (PaySim)",
        "url": "https://www.kaggle.com/datasets/sriharshaeedala/financial-fraud-detection-dataset",
        "description": "Synthetic mobile-money data; documented isFraud label. Balance-after/before fields are excluded from model features because fraud transactions are annulled and those fields can leak the target.",
        "aliases": {
            "transaction_id": ["transactionid", "stepid"], "time": ["step", "timestamp", "transactiondate", "date"],
            "source": ["nameorig", "sourceaccount", "sourceaccountid", "originaccount", "accountid"],
            "target": ["namedest", "targetaccount", "targetaccountid", "destinationaccount", "counterpartyid"],
            "amount": ["amount", "transactionamount", "value"], "type": ["type", "transactiontype", "channel"],
            "label": ["isfraud", "fraud", "is_fraud", "fraudlabel", "target"], "currency": ["currency", "currencycode", "currency_code"],
        },
        "leakage": ["oldbalanceorg", "newbalanceorig", "oldbalancedest", "newbalancedest", "isflaggedfraud"],
    },
    "thuandao": {
        "id": "thuandao", "name": "Bank Transactions Dataset for Fraud Detection",
        "url": "https://www.kaggle.com/datasets/thuandao/bank-transactions-dataset-for-fraud-detection",
        "description": "Independent schema profile. Kaggle's public page did not expose a complete column schema during implementation; fields are matched only from present headers and no missing fields are synthesized.",
        "aliases": {
            "transaction_id": ["transactionid", "transaction_id", "transactionno", "transactionnumber", "id"],
            "time": ["timestamp", "transactiondate", "date", "datetime", "time"],
            "source": ["accountid", "sourceaccount", "sourceaccountid", "fromaccount", "senderid", "customerid"],
            "target": ["targetaccount", "targetaccountid", "toaccount", "receiverid", "merchantid", "counterpartyid"],
            "amount": ["amount", "transactionamount", "transaction_amount", "value"],
            "type": ["type", "transactiontype", "transaction_type", "channel", "category"],
            "label": ["isfraud", "fraud", "is_fraud", "fraudlabel", "fraud_label", "label", "class"], "currency": ["currency", "currencycode", "currency_code"],
        }, "leakage": [],
    },
    "yogeshtekawade": {
        "id": "yogeshtekawade", "name": "Banking and Customer Transaction Data",
        "url": "https://www.kaggle.com/datasets/yogeshtekawade/banking-and-customer-transaction-data",
        "description": "The documented transaction file has Transaction_ID, Customer_ID, Account_Type, Total_Balance, Transaction_Amount, Investment_Amount, Investment_Type, Transaction_Date; no fraud label is documented. This profile stays unlabeled unless the uploaded file actually has an explicit fraud-label column.",
        "aliases": {
            "transaction_id": ["transactionid", "transaction_id"], "time": ["transactiondate", "transaction_date", "date", "timestamp"],
            "source": ["customerid", "customer_id", "accountid"], "target": ["counterpartyid", "merchantid"],
            "amount": ["transactionamount", "transaction_amount", "amount"], "type": ["accounttype", "account_type", "investmenttype", "investment_type", "type"],
            "label": ["isfraud", "fraud", "is_fraud", "fraudlabel", "fraud_label", "label", "class"], "currency": ["currency", "currencycode", "currency_code"],
        }, "leakage": ["totalbalance", "total_balance", "investmentamount", "investment_amount"],
    },
}

app = FastAPI(title="MuleTrace API", version="1.0.0", description="Fraud intelligence and tamper-evident audit API")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("MULETRACE_CORS_ORIGINS", "http://localhost:3000").split(","), allow_credentials=False, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])


def db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if DB_PATH.exists():
        os.chmod(DB_PATH, 0o600)
    else:
        fd = os.open(DB_PATH, os.O_CREAT | os.O_RDWR, 0o600)
        os.close(fd)
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    for suffix in ("-wal", "-shm"):
        sidecar = Path(str(DB_PATH) + suffix)
        if sidecar.exists(): os.chmod(sidecar, 0o600)
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with db() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS batches(id TEXT PRIMARY KEY, filename TEXT NOT NULL, source_id TEXT NOT NULL, created_at TEXT NOT NULL, rows_total INTEGER NOT NULL, rows_processed INTEGER NOT NULL, duplicates INTEGER NOT NULL, invalid INTEGER NOT NULL, label_column TEXT, labeled_rows INTEGER NOT NULL, fraud_labels INTEGER NOT NULL, schema_json TEXT NOT NULL, metrics_json TEXT, provenance_json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY, case_number TEXT UNIQUE NOT NULL, status TEXT NOT NULL, risk_score REAL NOT NULL, risk_level TEXT NOT NULL, detail_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, batch_id TEXT NOT NULL REFERENCES batches(id));
        CREATE TABLE IF NOT EXISTS audits(id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), decision TEXT NOT NULL, decided_by TEXT NOT NULL, decided_at TEXT NOT NULL, note TEXT, result_hash TEXT NOT NULL, tx_hash TEXT NOT NULL, chain_id TEXT NOT NULL, block_number INTEGER NOT NULL, verification_status TEXT NOT NULL, verified_at TEXT);
        CREATE TABLE IF NOT EXISTS model_versions(version_id TEXT PRIMARY KEY,batch_id TEXT NOT NULL UNIQUE REFERENCES batches(id),digest TEXT NOT NULL UNIQUE,model_name TEXT NOT NULL,manifest_json TEXT NOT NULL,artifact_path TEXT,tx_hash TEXT NOT NULL DEFAULT '',chain_id TEXT NOT NULL DEFAULT 'unconfigured',block_number INTEGER NOT NULL DEFAULT 0,verification_status TEXT NOT NULL DEFAULT 'not_anchored',verified_at TEXT);
        CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, entity_id TEXT NOT NULL, event_at TEXT NOT NULL, detail_json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS seen_rows(row_hash TEXT NOT NULL, batch_id TEXT NOT NULL, source_id TEXT NOT NULL, PRIMARY KEY(source_id,row_hash));
        CREATE TABLE IF NOT EXISTS normalized_flows(id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id TEXT NOT NULL REFERENCES batches(id), source_id TEXT NOT NULL, source_fingerprint TEXT, target_fingerprint TEXT, amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'units', risk_score INTEGER NOT NULL, inserted_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS ix_flows_source ON normalized_flows(source_id);
        CREATE INDEX IF NOT EXISTS ix_cases_created ON cases(created_at DESC);
        CREATE INDEX IF NOT EXISTS ix_audits_time ON audits(decided_at DESC);
        """)
        model_columns = {row[1] for row in c.execute("PRAGMA table_info(model_versions)").fetchall()}
        if "artifact_path" not in model_columns: c.execute("ALTER TABLE model_versions ADD COLUMN artifact_path TEXT")
        flow_columns = {row[1] for row in c.execute("PRAGMA table_info(normalized_flows)").fetchall()}
        if "currency" not in flow_columns:
            c.execute("ALTER TABLE normalized_flows ADD COLUMN currency TEXT NOT NULL DEFAULT 'units'")


@app.on_event("startup")
def on_startup() -> None:
    if APP_ENV == "production" and not os.getenv("MULETRACE_API_TOKENS"):
        raise RuntimeError("MULETRACE_API_TOKENS must be configured in production")
    if APP_ENV == "production" and not os.getenv("MULETRACE_FINGERPRINT_SECRET"):
        raise RuntimeError("MULETRACE_FINGERPRINT_SECRET must be configured and backed up in production")
    init_db()


def authenticate(authorization: str | None = Header(default=None)) -> dict[str, str]:
    raw = os.getenv("MULETRACE_API_TOKENS", "")
    if not raw:
        if APP_ENV == "production":
            raise HTTPException(503, "Authentication is not configured")
        return {"actor": "local-analyst", "role": "analyst"}
    try:
        tokens = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(503, "Invalid authentication configuration") from e
    bearer = authorization[7:] if authorization and authorization.lower().startswith("bearer ") else ""
    for role, token in tokens.items():
        if bearer and isinstance(token, str) and secrets_equal(bearer, token):
            return {"actor": role, "role": role}
    raise HTTPException(401, "Valid bearer token required", headers={"WWW-Authenticate": "Bearer"})


def secrets_equal(a: str, b: str) -> bool:
    import hmac
    return hmac.compare_digest(a.encode(), b.encode())


def require_analyst(user: dict[str, str] = Depends(authenticate)) -> dict[str, str]:
    if user["role"] not in {"analyst", "admin"}:
        raise HTTPException(403, "Analyst role required")
    return user


def require_admin(user: dict[str, str] = Depends(authenticate)) -> dict[str, str]:
    if user["role"] != "admin": raise HTTPException(403, "Admin role required")
    return user


def normalize(s: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(s or "").strip().lower())


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def json_dump(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)


def fingerprint_identifier(value: str) -> str:
    import hmac
    configured = os.getenv("MULETRACE_FINGERPRINT_SECRET")
    if configured:
        key = configured.encode("utf-8")
    else:
        key_path = DB_PATH.with_suffix(".fingerprint.key")
        key_path.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(key_path, os.O_CREAT | os.O_RDWR, 0o600)
        with os.fdopen(fd, "r+b") as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            f.seek(0, os.SEEK_END)
            if f.tell() == 0:
                f.write(os.urandom(32)); f.flush(); os.fsync(f.fileno())
            f.seek(0); key = f.read()
    return hmac.new(key, value.casefold().encode("utf-8"), hashlib.sha256).hexdigest()


def risk_level(score: float) -> str:
    return "critical" if score >= 85 else "high" if score >= 65 else "medium" if score >= 40 else "low"


def number(value: Any) -> float | None:
    try:
        v = float(str(value).replace(",", "").strip())
        return v if math.isfinite(v) else None
    except (ValueError, TypeError):
        return None


def truth(value: Any) -> int | None:
    if value is None or str(value).strip() == "": return None
    s = str(value).strip().lower()
    if s in {"1", "1.0", "true", "yes", "fraud", "fraudulent"}: return 1
    if s in {"0", "0.0", "false", "no", "legit", "legitimate", "not fraud", "non-fraud"}: return 0
    return None


def map_columns(headers: list[str], source: dict[str, Any]) -> dict[str, str | None]:
    lookup = {normalize(h): h for h in headers}
    out: dict[str, str | None] = {}
    for target, aliases in source["aliases"].items():
        out[target] = next((lookup[normalize(a)] for a in aliases if normalize(a) in lookup), None)
    return out


def parse_time(value: Any, field: str | None) -> str:
    if value is None or str(value).strip() == "": return ""
    if field and normalize(field) == "step":
        step = number(value)
        if step is not None:
            return f"step:{int(step):010d}"
    text = str(value).strip()
    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except ValueError:
        return text


def feature_rows(rows: list[dict[str, str]], mapping: dict[str, str | None], excluded: set[str]) -> tuple[list[list[float]], list[str]]:
    # Model features intentionally exclude identifiers, labels, balance-after fields, and post-outcome flags.
    candidates = [h for h in (rows[0].keys() if rows else []) if normalize(h) not in excluded]
    clean = []
    for h in candidates:
        vals = [r.get(h, "") for r in rows[:min(1000, len(rows))]]
        nums = [number(v) for v in vals if str(v).strip() != ""]
        if nums and len(nums) >= max(3, int(len(vals) * .6)):
            clean.append((h, "num"))
        elif len({str(v).strip() for v in vals if str(v).strip()}) <= 30:
            clean.append((h, "cat"))
    # A small self-contained feature matrix, with one-hot-like categorical hashes.
    cols: list[str] = []
    category_values: dict[str, list[str]] = {}
    for h, kind in clean:
        if kind == "num": cols.append("num:" + h)
        else:
            values = sorted({str(r.get(h, "")).strip().lower() for r in rows if str(r.get(h, "")).strip()})[:30]
            category_values[h] = values
            cols.extend(f"cat:{h}={v}" for v in values)
    matrix: list[list[float]] = []
    for row in rows:
        vec: list[float] = []
        for h, kind in clean:
            if kind == "num":
                v = number(row.get(h)); vec.append(float(v or 0.0))
            else:
                val = str(row.get(h, "")).strip().lower()
                vec.extend([1.0 if val == option else 0.0 for option in category_values[h]])
        matrix.append(vec)
    if not cols:
        amounts = [number(r.get(mapping.get("amount") or "", "")) or 0.0 for r in rows]
        cols = ["log_amount"]
        matrix = [[math.log1p(max(0, a))] for a in amounts]
    return matrix, cols


def persist_model_artifact(bundle: dict[str, Any] | None) -> tuple[str | None, str | None, str]:
    if bundle is None: return None, None, "not_trained"
    model_dir = Path(os.getenv("MULETRACE_MODEL_DIR", str(DB_PATH.parent / "model_artifacts")))
    model_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(model_dir, 0o700)
    fd, temp_name = tempfile.mkstemp(prefix=".model-", suffix=".tmp", dir=model_dir)
    try:
        with os.fdopen(fd, "wb") as stream:
            os.chmod(temp_name, 0o600)
            pickle.dump(bundle, stream, protocol=5)
            stream.flush(); os.fsync(stream.fileno())
        max_bytes = max(1, int(os.getenv("MULETRACE_MAX_MODEL_ARTIFACT_BYTES", str(50 * 1024 * 1024))))
        if os.path.getsize(temp_name) > max_bytes:
            os.unlink(temp_name)
            return None, None, "omitted_size_limit"
        hasher = hashlib.sha256()
        with open(temp_name, "rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""): hasher.update(chunk)
        artifact_hash = hasher.hexdigest()
        target = model_dir / f"{artifact_hash}.pkl"
        if target.exists():
            os.unlink(temp_name); os.chmod(target, 0o600)
        else:
            os.replace(temp_name, target); os.chmod(target, 0o600)
        return str(target), artifact_hash, "persisted"
    except Exception:
        try: os.unlink(temp_name)
        except OSError: pass
        return None, None, "persistence_failed"


def score_batch(rows: list[dict[str, str]], mapping: dict[str, str | None], source: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    label_col = mapping.get("label")
    valid_labels = [truth(r.get(label_col)) for r in rows] if label_col else [None] * len(rows)
    labeled = [(i, y) for i, y in enumerate(valid_labels) if y is not None]
    excluded = set(source.get("leakage", [])) | {normalize(v) for v in [label_col, mapping.get("transaction_id"), mapping.get("source"), mapping.get("target")] if v}
    excluded |= {"id", "transactionid", "customerid", "accountid", "nameorig", "namedest", "step"}
    X, feature_names = feature_rows(rows, mapping, excluded)
    # Amount baselines/features are normalized independently inside each actually declared currency.
    amount_header, currency_header = mapping.get("amount"), mapping.get("currency")
    amount_feature = feature_names.index("num:" + amount_header) if amount_header and "num:" + amount_header in feature_names else None
    currency_groups: dict[str, list[float]] = defaultdict(list)
    for row in rows:
        amt = number(row.get(amount_header or ""))
        if amt is not None:
            cur = str(row.get(currency_header or "") or "units").strip().upper() if currency_header else "units"
            currency_groups[cur].append(amt)
    currency_scales: dict[str, tuple[float,float]] = {}
    for cur, vals in currency_groups.items():
        med = statistics.median(vals); mad = statistics.median([abs(v-med) for v in vals])
        currency_scales[cur] = (med, max(mad * 1.4826, statistics.pstdev(vals) if len(vals)>1 else 1.0, 1.0))
    if amount_feature is not None:
        for i, row in enumerate(rows):
            cur = str(row.get(currency_header or "") or "units").strip().upper() if currency_header else "units"
            value = number(row.get(amount_header or "")) or 0.0
            med, scale = currency_scales.get(cur, (0.0, 1.0))
            X[i][amount_feature] = max(-20.0, min(20.0, (value-med)/scale))
    model_scores: list[float] | None = None
    explanation_models: list[tuple[Any, Any, float] | None] = [None] * len(rows)
    anomaly_baseline: tuple[Any, Any] | None = None
    artifact_bundle: dict[str, Any] = {"format": "muletrace-estimator-bundle-v1", "featureNames": feature_names, "randomForestOof": [], "randomForestFinal": None, "isolationForest": None}
    metrics: dict[str, Any] = {"status": "not_evaluated", "reason": "No usable fraud labels were present; supervised evaluation is not applicable.", "labeledRows": len(labeled), "fraudLabels": sum(y == 1 for _, y in labeled), "precision": None, "recall": None, "f1": None, "prAuc": None, "rocAuc": None, "confusionMatrix": None}
    if len(labeled) >= 20 and len({y for _, y in labeled}) == 2:
        try:
            import numpy as np
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.metrics import average_precision_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
            from sklearn.model_selection import StratifiedKFold, cross_val_predict
            import warnings
            idx = [i for i, _ in labeled]
            y = np.array([v for _, v in labeled], dtype=int)
            min_class = int(np.bincount(y).min())
            fold_count = min(5, min_class)
            if fold_count >= 2 and X and X[0]:
                xlab = np.asarray([X[i] for i in idx], dtype=float)
                cv = StratifiedKFold(n_splits=fold_count, shuffle=True, random_state=31)
                probs = np.zeros(len(y), dtype=float)
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    for train_pos, test_pos in cv.split(xlab, y):
                        fold_model = RandomForestClassifier(n_estimators=100, min_samples_leaf=2, class_weight="balanced_subsample", random_state=31, n_jobs=-1, max_features="sqrt")
                        fold_model.fit(xlab[train_pos], y[train_pos])
                        fold_probs = fold_model.predict_proba(xlab[test_pos])[:, 1]
                        probs[test_pos] = fold_probs
                        medians = np.median(xlab[train_pos], axis=0)
                        artifact_bundle["randomForestOof"].append({"model": fold_model, "trainingMedian": medians})
                        for pos, probability in zip(test_pos, fold_probs):
                            explanation_models[idx[int(pos)]] = (fold_model, medians, float(probability))
                pred = (probs >= .5).astype(int)
                tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel().tolist()
                metrics = {"status": "evaluated", "method": f"{fold_count}-fold stratified out-of-fold", "labeledRows": len(labeled), "fraudLabels": int(y.sum()), "precision": float(precision_score(y, pred, zero_division=0)), "recall": float(recall_score(y, pred, zero_division=0)), "f1": float(f1_score(y, pred, zero_division=0)), "prAuc": float(average_precision_score(y, probs)), "rocAuc": float(roc_auc_score(y, probs)), "confusionMatrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}, "features": feature_names, "excludedLeakageFields": sorted(source.get("leakage", []))}
                # Production risk scores for labeled rows use held-out (out-of-fold) predictions.
                model_scores = [None] * len(rows)  # type: ignore
                for (i, _), p in zip(labeled, probs): model_scores[i] = float(p)
                # For rows without a usable label, fit on labeled subset and predict only those rows.
                unlabeled = [i for i, v in enumerate(valid_labels) if v is None]
                if unlabeled:
                    final_model = RandomForestClassifier(n_estimators=100, min_samples_leaf=2, class_weight="balanced_subsample", random_state=31, n_jobs=-1, max_features="sqrt")
                    final_model.fit(xlab, y)
                    artifact_bundle["randomForestFinal"] = final_model
                    medians = np.median(xlab, axis=0)
                    for i in unlabeled:
                        model_scores[i] = float(final_model.predict_proba([X[i]])[0][1])
                        explanation_models[i] = (final_model, medians, float(model_scores[i]))
        except Exception as e:
            metrics["status"] = "unavailable"
            metrics["reason"] = f"Supervised evaluation failed safely: {type(e).__name__}"
    else:
        metrics["labeledRows"] = len(labeled)
        metrics["fraudLabels"] = sum(y == 1 for _, y in labeled)
        if label_col: metrics["reason"] = "At least 20 labeled rows and both classes are required for a stable cross-validated evaluation."

    # Unlabeled transactions receive unsupervised anomaly scores. Labels are never copied into a prediction score.
    if X and len(X) >= 20 and (model_scores is None or any(v is None for v in model_scores)):
        try:
            import numpy as np
            from sklearn.ensemble import IsolationForest
            forest = IsolationForest(n_estimators=100, contamination="auto", random_state=31, n_jobs=-1)
            matrix = np.asarray(X, dtype=float)
            fit_limit = int(os.getenv("MULETRACE_MODEL_MAX_ROWS", "30000"))
            fit_idx = np.arange(min(len(matrix), fit_limit))
            forest.fit(matrix[fit_idx])
            artifact_bundle["isolationForest"] = forest
            anomaly_baseline = (np.median(matrix[fit_idx], axis=0), np.maximum(np.std(matrix[fit_idx], axis=0), 1.0))
            raw_anomaly = -forest.score_samples(matrix)
            ranks = np.argsort(np.argsort(raw_anomaly, kind="mergesort"), kind="mergesort")
            anomaly_scores = (ranks / max(1, len(ranks)-1)).astype(float)
            if model_scores is None: model_scores = [None] * len(rows)
            for i, value in enumerate(model_scores):
                if value is None: model_scores[i] = float(anomaly_scores[i])
            metrics["anomalyModel"] = "IsolationForest"
            if metrics["status"] != "evaluated": metrics["status"] = "not_evaluated"
        except Exception:
            metrics["anomalyModel"] = "unavailable"
    amounts = [number(r.get(mapping.get("amount") or "", "")) for r in rows]
    src_col, dst_col = mapping.get("source"), mapping.get("target")
    dst_sources: dict[str, set[str]] = defaultdict(set); src_targets: dict[str, set[str]] = defaultdict(set)
    for r in rows:
        s, d = (str(r.get(src_col) or "").strip() if src_col else ""), (str(r.get(dst_col) or "").strip() if dst_col else "")
        if s and d: dst_sources[d].add(s); src_targets[s].add(d)
    scored = []
    for i, r in enumerate(rows):
        amt = amounts[i] or 0.0
        currency_col = mapping.get("currency")
        cur = str(r.get(currency_col or "") or "units").strip().upper() if currency_col else "units"
        median, scale = currency_scales.get(cur, (0.0, 1.0))
        s = str(r.get(src_col) or "").strip() if src_col else ""
        d = str(r.get(dst_col) or "").strip() if dst_col else ""
        factors = []
        z = max(0.0, (amt - median) / scale)
        if z >= 4:
            factors.append({"id": "amount-outlier", "pattern": "amount-outlier", "title": "Unusually large transaction", "description": f"Amount is {z:.1f} robust scale units above the batch median ({median:.2f}); amount outliers are a review signal, not proof of fraud.", "weight": min(65, 25 + z * 5), "evidence": {"accountsInvolved": 2, "transactionsInvolved": 1, "totalAmount": amt}})
        indegree = len(dst_sources.get(d, set())) if d else 0
        outdegree = len(src_targets.get(s, set())) if s else 0
        if indegree >= 5:
            factors.append({"id": "fan-in", "pattern": "fan-in", "title": "Funds consolidated from multiple accounts", "description": f"The destination receives funds from {indegree} distinct source accounts in this uploaded batch.", "weight": min(70, 30 + indegree * 3), "evidence": {"accountsInvolved": indegree + 1, "transactionsInvolved": indegree, "totalAmount": amt}})
        if outdegree >= 5:
            factors.append({"id": "fan-out", "pattern": "fan-out", "title": "Funds distributed to multiple accounts", "description": f"The source sends funds to {outdegree} distinct destination accounts in this uploaded batch.", "weight": min(70, 30 + outdegree * 3), "evidence": {"accountsInvolved": outdegree + 1, "transactionsInvolved": outdegree, "totalAmount": amt}})
        rule_score = min(1.0, max([f["weight"] / 100 for f in factors], default=0.0))
        ml_score = model_scores[i] if model_scores and i < len(model_scores) else None
        score = int(round((0.70 * ml_score + 0.30 * rule_score) * 100)) if ml_score is not None else int(round(rule_score * 100))
        if not factors and ml_score is not None and ml_score >= .65:
            model_kind = "supervised model probability" if metrics.get("status") == "evaluated" else "unsupervised IsolationForest anomaly percentile"
            factors.append({"id": "model-score", "pattern": "anomaly-score", "title": "Elevated model risk score", "description": f"{model_kind}: {ml_score:.3f}. This is a prediction for analyst review, not an adjudicated fraud finding.", "weight": round(ml_score * 100, 1), "evidence": {"accountsInvolved": int(bool(s)) + int(bool(d)), "transactionsInvolved": 1, "totalAmount": amt}})
        scored.append({"score": score, "riskLevel": risk_level(score), "factors": factors, "label": valid_labels[i], "modelScore": ml_score, "featureAttributions": []})
    threshold = int(os.getenv("MULETRACE_ALERT_THRESHOLD", "65"))
    explanation_cap = max(1, min(1000, int(os.getenv("MULETRACE_MAX_ATTRIBUTIONS", "200"))))
    explain_indices = sorted((i for i, item in enumerate(scored) if item["score"] >= threshold), key=lambda i: (-scored[i]["score"], i))[:explanation_cap]
    for i in explain_indices:
        explanation = explanation_models[i]
        attributions = []
        if explanation is not None and feature_names:
            model_for_row, baseline_values, actual_probability = explanation
            local = np.asarray(X[i], dtype=float)
            impacts = []
            for j, importance in enumerate(getattr(model_for_row, "feature_importances_", [])):
                counterfactual = local.copy(); counterfactual[j] = baseline_values[j]
                cf_probability = float(model_for_row.predict_proba([counterfactual])[0][1])
                effect = round((actual_probability - cf_probability) * 100, 1)
                if effect != 0:
                    impacts.append({"feature": feature_names[j].replace("num:", "").replace("cat:", ""), "effectPoints": effect, "globalImportance": round(float(importance), 4), "method": "held-out leave-one-feature-out perturbation"})
            attributions = sorted(impacts, key=lambda x: abs(x["effectPoints"]), reverse=True)[:5]
        elif anomaly_baseline is not None and feature_names:
            medians, scales = anomaly_baseline
            deviations = [{"feature": feature_names[j].replace("num:", "").replace("cat:", ""), "standardizedDeviation": round(float((X[i][j]-medians[j])/scales[j]), 2), "method": "within-batch feature deviation; context, not causal attribution"} for j in range(min(len(feature_names), len(X[i])))]
            attributions = sorted(deviations, key=lambda x: abs(x["standardizedDeviation"]), reverse=True)[:5]
        scored[i]["featureAttributions"] = attributions

    metrics.setdefault("features", feature_names)
    if artifact_bundle["randomForestOof"] or artifact_bundle["randomForestFinal"] is not None or artifact_bundle["isolationForest"] is not None:
        metrics["_artifactBundle"] = artifact_bundle
    return scored, metrics


def evm_confirmation_depth() -> int:
    try: return max(1, min(100, int(os.getenv("MULETRACE_EVM_CONFIRMATIONS", "1"))))
    except ValueError: return 1


def wait_for_confirmed_receipt(w3: Any, tx_hash: Any) -> tuple[Any | None, bool]:
    """Retry receipt polling and require configured block depth; never rebroadcast on retries."""
    try: timeout = max(5.0, min(120.0, float(os.getenv("MULETRACE_EVM_CONFIRMATION_TIMEOUT", "90"))))
    except ValueError: timeout = 90.0
    try: retries = max(0, min(5, int(os.getenv("MULETRACE_EVM_RETRIES", "2"))))
    except ValueError: retries = 2
    deadline = time.monotonic() + timeout
    receipt = None
    for attempt in range(retries + 1):
        remaining = deadline - time.monotonic()
        if remaining <= 0: break
        try:
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=min(20.0, remaining))
            break
        except Exception:
            if attempt >= retries: break
            time.sleep(min(0.5 * (2 ** attempt), max(0.0, deadline - time.monotonic())))
    if receipt is None: return None, False
    target_block = int(receipt.blockNumber) + evm_confirmation_depth() - 1
    while time.monotonic() < deadline:
        try:
            if int(w3.eth.block_number) >= target_block: return receipt, True
        except Exception:
            pass
        time.sleep(min(1.0, max(0.0, deadline - time.monotonic())))
    return receipt, False


def has_evm_confirmation_depth(w3: Any, block_number: int) -> bool:
    try: return int(w3.eth.block_number) >= int(block_number) + evm_confirmation_depth() - 1
    except Exception: return False


def blockchain_anchor(digest: str, model_version: bool = False) -> dict[str, Any]:
    rpc, address, private_key = (os.getenv("MULETRACE_EVM_RPC_URL"), os.getenv("MULETRACE_AUDIT_CONTRACT"), os.getenv("MULETRACE_EVM_PRIVATE_KEY"))
    chain = os.getenv("MULETRACE_CHAIN_ID", "unconfigured")
    if not all([rpc, address, private_key]):
        return {"tx": "", "chain": chain, "block": 0, "status": "failed", "verifiedAt": None}
    tx_hex = ""
    active_chain = chain
    try:
        from web3 import Web3
        w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 15}))
        if not w3.is_connected(): raise RuntimeError("RPC unavailable")
        anchor_name = "anchorModelVersion" if model_version else "anchor"
        verify_name = "verifyModelVersion" if model_version else "verify"
        abi = [{"inputs": [{"internalType": "bytes32", "name": "digest", "type": "bytes32"}], "name": anchor_name, "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "bytes32", "name": "digest", "type": "bytes32"}], "name": verify_name, "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"}]
        contract = w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)
        acct = w3.eth.account.from_key(private_key)
        nonce = w3.eth.get_transaction_count(acct.address)
        tx = getattr(contract.functions, anchor_name)(bytes.fromhex(digest)).build_transaction({"from": acct.address, "nonce": nonce, "chainId": w3.eth.chain_id, "gas": 180000, "gasPrice": w3.eth.gas_price})
        signed = acct.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        tx_hex = tx_hash.hex()
        active_chain = str(w3.eth.chain_id)
        receipt, confirmed = wait_for_confirmed_receipt(w3, tx_hash)
        if receipt is None: return {"tx": tx_hex, "chain": active_chain, "block": 0, "status": "pending", "verifiedAt": None}
        receipt_block = int(receipt.blockNumber)
        if int(receipt.status) != 1: return {"tx": tx_hex, "chain": active_chain, "block": receipt_block, "status": "failed", "verifiedAt": None}
        if not confirmed: return {"tx": tx_hex, "chain": active_chain, "block": receipt_block, "status": "pending", "verifiedAt": None}
        is_verified = bool(getattr(contract.functions, verify_name)(bytes.fromhex(digest)).call(block_identifier=receipt_block))
        return {"tx": tx_hex, "chain": str(w3.eth.chain_id), "block": int(receipt.blockNumber), "status": "verified" if is_verified else "failed", "verifiedAt": iso_now() if is_verified else None}
    except Exception:
        if tx_hex: return {"tx": tx_hex, "chain": active_chain, "block": 0, "status": "pending", "verifiedAt": None}
        return {"tx": "", "chain": chain, "block": 0, "status": "failed", "verifiedAt": None}


def independently_verify_anchor(digest: str, tx_hash: str, expected_chain: str, expected_block: int, model_version: bool = False) -> int | None:
    rpc, address = os.getenv("MULETRACE_EVM_RPC_URL"), os.getenv("MULETRACE_AUDIT_CONTRACT")
    if not rpc or not address or not tx_hash or not digest: return None
    try:
        from web3 import Web3
        w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 15}))
        if not w3.is_connected() or str(w3.eth.chain_id) != str(expected_chain): return None
        verify_name = "verifyModelVersion" if model_version else "verify"
        event_name = "ModelVersionAnchored" if model_version else "CommitmentAnchored"
        abi = [
            {"inputs": [{"internalType": "bytes32", "name": "digest", "type": "bytes32"}], "name": verify_name, "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"},
            {"anonymous": False, "inputs": [{"indexed": True, "internalType": "bytes32", "name": "digest", "type": "bytes32"}, {"indexed": True, "internalType": "address", "name": "auditor", "type": "address"}, {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}], "name": event_name, "type": "event"},
        ]
        contract = w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        if int(receipt.status) != 1 or (int(expected_block) > 0 and int(receipt.blockNumber) != int(expected_block)) or not has_evm_confirmation_depth(w3, int(receipt.blockNumber)): return None
        events = getattr(contract.events, event_name)().process_receipt(receipt)
        event_match = any(Web3.to_hex(event["args"]["digest"]).lower() == ("0x" + digest.lower()) for event in events)
        is_verified = event_match and bool(getattr(contract.functions, verify_name)(bytes.fromhex(digest)).call(block_identifier=receipt.blockNumber))
        return int(receipt.blockNumber) if is_verified else None
    except Exception:
        return None


def case_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM cases ORDER BY created_at DESC").fetchall()


def summary_case(row: sqlite3.Row) -> dict[str, Any]:
    d = json.loads(row["detail_json"])
    return {"id": row["id"], "caseNumber": row["case_number"], "subjectAccountId": d["subjectAccountId"], "riskScore": row["risk_score"], "riskLevel": row["risk_level"], "status": row["status"], "primaryPattern": (d["riskFactors"][0]["pattern"] if d["riskFactors"] else "rapid-inflow-outflow"), "flaggedVolume": d["flaggedVolume"], "currency": d["currency"], "accountCount": d.get("totalAccountCount", len(d["accounts"])), "transactionCount": d.get("totalTransactionCount", len(d["transactions"])), "createdAt": row["created_at"], "updatedAt": row["updated_at"], "auditVerified": bool(d.get("audit") and d["audit"].get("verificationStatus") == "verified")}


def row_to_detail(row: sqlite3.Row) -> dict[str, Any]:
    d = json.loads(row["detail_json"])
    d.update({"id": row["id"], "caseNumber": row["case_number"], "status": row["status"], "riskScore": row["risk_score"], "riskLevel": row["risk_level"], "createdAt": row["created_at"], "updatedAt": row["updated_at"]})
    audit = db().execute("SELECT * FROM audits WHERE case_id=? ORDER BY decided_at DESC LIMIT 1", (row["id"],)).fetchone()
    if audit:
        d["audit"] = audit_json(audit)
        d.update({"decidedBy": audit["decided_by"], "decidedAt": audit["decided_at"], "decisionNote": audit["note"]})
    return d


def audit_json(a: sqlite3.Row) -> dict[str, Any]:
    out = {"investigationId": a["case_id"], "decision": a["decision"], "decidedBy": a["decided_by"], "decidedAt": a["decided_at"], "resultHash": a["result_hash"], "transactionHash": a["tx_hash"], "chainId": a["chain_id"], "blockNumber": a["block_number"], "verificationStatus": a["verification_status"]}
    if a["verified_at"]: out["verifiedAt"] = a["verified_at"]
    return out


@app.get("/health")
def health():
    init_db()
    return {"status": "ok", "authentication": "configured" if os.getenv("MULETRACE_API_TOKENS") else "development-open", "blockchain": "configured" if all(os.getenv(k) for k in ["MULETRACE_EVM_RPC_URL", "MULETRACE_AUDIT_CONTRACT", "MULETRACE_EVM_PRIVATE_KEY"]) else "not-configured"}


@app.get("/api/datasets")
def datasets(_: dict[str, str] = Depends(authenticate)):
    with db() as c:
        result = []
        for profile in DATASETS.values():
            batches = c.execute("SELECT id,filename,created_at,rows_total,rows_processed,duplicates,invalid,label_column,labeled_rows,fraud_labels,metrics_json,provenance_json FROM batches WHERE source_id=? ORDER BY created_at DESC", (profile["id"],)).fetchall()
            result.append({**{k: profile[k] for k in ["id", "name", "url", "description"]}, "imports": [{"id": b["id"], "filename": b["filename"], "createdAt": b["created_at"], "rowsTotal": b["rows_total"], "rowsProcessed": b["rows_processed"], "duplicates": b["duplicates"], "invalid": b["invalid"], "labelColumn": b["label_column"], "labeledRows": b["labeled_rows"], "fraudLabels": b["fraud_labels"], "metrics": json.loads(b["metrics_json"]) if b["metrics_json"] else None, "provenance": json.loads(b["provenance_json"])} for b in batches]})
        return result


@app.get("/api/intelligence/cross-source")
def cross_source_intelligence(_: dict[str, str] = Depends(authenticate)):
    with db() as c:
        flows = c.execute("SELECT source_id,source_fingerprint,target_fingerprint,amount,currency,risk_score FROM normalized_flows").fetchall()
    candidates: dict[str, dict[str, Any]] = {}
    source_names = {key: value["name"] for key, value in DATASETS.items()}
    for flow in flows:
        for fingerprint in (flow["source_fingerprint"], flow["target_fingerprint"]):
            if not fingerprint: continue
            item = candidates.setdefault(fingerprint, {"profiles": set(), "occurrences": 0, "volumes": defaultdict(float), "highestRiskScore": 0})
            item["profiles"].add(flow["source_id"])
            item["occurrences"] += 1
            item["volumes"][flow["currency"]] += float(flow["amount"])
            item["highestRiskScore"] = max(item["highestRiskScore"], int(flow["risk_score"]))
    matches = []
    for fingerprint, item in candidates.items():
        if len(item["profiles"]) < 2: continue
        profiles = sorted(item["profiles"])
        currencies = sorted(item["volumes"])
        same_currency = len(currencies) == 1
        matches.append({"fingerprint": "hmac:" + fingerprint[:16], "sourceProfiles": profiles, "sourceDatasetNames": [source_names.get(p, p) for p in profiles], "occurrences": item["occurrences"], "flaggedVolume": round(item["volumes"][currencies[0]], 2) if same_currency else 0, "currency": currencies[0] if same_currency else "mixed", "highestRiskScore": item["highestRiskScore"], "interpretation": "Potential identifier collision/link candidate only. Matching text across datasets is not proof that records belong to the same person or account."})
    matches.sort(key=lambda item: (-len(item["sourceProfiles"]), -item["highestRiskScore"], -item["occurrences"]))
    return {"candidateMatches": matches, "candidateCount": len(matches), "method": "Exact case-folded identifier values transformed with a keyed HMAC-SHA-256; original identifiers are not returned by this endpoint.", "limitation": "Identifiers from separate synthetic/real datasets may collide. Treat every match as an analyst lead; do not merge entities or infer fraud without independent evidence."}


def model_version_json(row: sqlite3.Row) -> dict[str, Any]:
    manifest = json.loads(row["manifest_json"]) if "manifest_json" in row.keys() else {}
    return {"versionId": row["version_id"], "batchId": row["batch_id"], "sha256": row["digest"], "model": row["model_name"], "artifactSha256": manifest.get("artifactSha256"), "artifactStatus": manifest.get("artifactStatus", "not_trained"), "transactionHash": row["tx_hash"], "chainId": row["chain_id"], "blockNumber": row["block_number"], "verificationStatus": row["verification_status"], "verifiedAt": row["verified_at"]}


@app.get("/api/model/metrics")
def model_metrics(_: dict[str, str] = Depends(authenticate)):
    with db() as c:
        batches = c.execute("SELECT id,source_id,filename,created_at,metrics_json FROM batches ORDER BY created_at DESC").fetchall()
        versions = c.execute("SELECT version_id,batch_id,digest,model_name,manifest_json,tx_hash,chain_id,block_number,verification_status,verified_at FROM model_versions ORDER BY rowid DESC").fetchall()
    return {"model": "RandomForestClassifier + IsolationForest + transparent batch rules", "evaluationMethod": "Stratified out-of-fold evaluation; leakage-prone balance columns excluded for PaySim", "evaluations": [{"batchId": b["id"], "sourceId": b["source_id"], "filename": b["filename"], "createdAt": b["created_at"], **(json.loads(b["metrics_json"]) if b["metrics_json"] else {"status": "not_evaluated", "precision": None, "recall": None, "f1": None, "prAuc": None, "rocAuc": None, "confusionMatrix": None})} for b in batches], "versions": [model_version_json(v) for v in versions], "blockchainConfigured": all(os.getenv(k) for k in ["MULETRACE_EVM_RPC_URL", "MULETRACE_AUDIT_CONTRACT", "MULETRACE_EVM_PRIVATE_KEY"])}

@app.post("/api/model/versions/{version_id}/anchor")
def anchor_model_version(version_id: str, user: dict[str, str] = Depends(require_admin)):
    with db() as c:
        version = c.execute("SELECT * FROM model_versions WHERE version_id=?", (version_id,)).fetchone()
        if not version: raise HTTPException(404, "Model version not found")
        if version["tx_hash"]: raise HTTPException(409, "This model version already has a submitted transaction; verify its receipt instead of resubmitting")
        if not all(os.getenv(k) for k in ["MULETRACE_EVM_RPC_URL", "MULETRACE_AUDIT_CONTRACT", "MULETRACE_EVM_PRIVATE_KEY"]): raise HTTPException(503, "EVM RPC, contract and signer are not configured")
        result = blockchain_anchor(version["digest"], model_version=True)
        c.execute("UPDATE model_versions SET tx_hash=?,chain_id=?,block_number=?,verification_status=?,verified_at=? WHERE version_id=?", (result["tx"],result["chain"],result["block"],result["status"],result["verifiedAt"],version_id))
        c.execute("INSERT INTO audit_log(actor,action,entity_id,event_at,detail_json) VALUES(?,?,?,?,?)", (user["actor"],"model_version.anchor",version_id,iso_now(),json_dump({"digest":version["digest"],"status":result["status"],"transactionHash":result["tx"]})))
        return model_version_json(c.execute("SELECT version_id,batch_id,digest,model_name,manifest_json,tx_hash,chain_id,block_number,verification_status,verified_at FROM model_versions WHERE version_id=?",(version_id,)).fetchone())


@app.get("/api/model/versions/{version_id}/verify")
def verify_model_version(version_id: str, _: dict[str, str] = Depends(authenticate)):
    with db() as c:
        version = c.execute("SELECT * FROM model_versions WHERE version_id=?",(version_id,)).fetchone()
        if not version: raise HTTPException(404,"Model version not found")
        verified_block = independently_verify_anchor(version["digest"],version["tx_hash"],version["chain_id"],version["block_number"],model_version=True) if version["tx_hash"] else None
        verified = verified_block is not None
        pending = version["verification_status"] == "pending" and bool(version["tx_hash"]) and not verified
        status = "verified" if verified else "pending" if pending else version["verification_status"]
        c.execute("UPDATE model_versions SET verification_status=?,verified_at=?,block_number=CASE WHEN ? IS NULL THEN block_number ELSE ? END WHERE version_id=?",(status,iso_now() if verified else None,verified_block,verified_block,version_id))
        result = model_version_json(c.execute("SELECT version_id,batch_id,digest,model_name,manifest_json,tx_hash,chain_id,block_number,verification_status,verified_at FROM model_versions WHERE version_id=?",(version_id,)).fetchone())
        result.update({"onChainVerified":verified,"verified":verified})
        return result


@app.get("/api/blockchain/status")
def blockchain_status(_: dict[str, str] = Depends(authenticate)):
    configured = all(os.getenv(k) for k in ["MULETRACE_EVM_RPC_URL", "MULETRACE_AUDIT_CONTRACT", "MULETRACE_EVM_PRIVATE_KEY"])
    return {"configured": configured, "chainId": os.getenv("MULETRACE_CHAIN_ID") if configured else None, "contractAddress": os.getenv("MULETRACE_AUDIT_CONTRACT") if configured else None, "mode": "EVM receipt plus on-chain digest verification" if configured else "off-chain SHA-256 only; no transactions submitted", "warning": None if configured else "No EVM endpoint, contract, and signer are configured. Audit records will not be reported as on-chain verified."}


@app.get("/api/dashboard/summary")
def dashboard(_: dict[str, str] = Depends(authenticate)):
    with db() as c:
        rows = case_rows(c)
        alerts = [r for r in rows if r["status"] == "open"]
        audits = c.execute("SELECT decision,COUNT(*) n FROM audits GROUP BY decision").fetchall()
        open_cases = [json.loads(r["detail_json"]) for r in alerts]
        currencies = {d.get("currency", "units") for d in open_cases}
        same_currency = len(currencies) <= 1
        volume = sum(float(d.get("flaggedVolume", 0)) for d in open_cases) if same_currency else 0
        currency = next(iter(currencies)) if len(currencies) == 1 else "units" if not currencies else "MULTI"
        return {"activeAlerts": len(alerts), "newAlertsToday": sum(1 for r in alerts if r["created_at"][:10] == iso_now()[:10]), "highRiskInvestigations": sum(1 for r in rows if r["status"] == "open" and r["risk_level"] in {"high", "critical"}), "openInvestigations": sum(r["status"] == "open" for r in rows), "confirmedInvestigations": sum(r["decision"] == "confirmed" for r in audits), "clearedInvestigations": sum(r["decision"] == "cleared" for r in audits), "flaggedVolume": volume, "currency": currency, "recentInvestigations": [summary_case(r) for r in rows[:6]]}


@app.get("/api/alerts")
def alerts(_: dict[str, str] = Depends(authenticate)):
    with db() as c:
        results = []
        for row in case_rows(c):
            d = json.loads(row["detail_json"])
            factors = d.get("riskFactors", [])
            results.append({"id": row["id"], "investigationId": row["id"], "accountId": d["subjectAccountId"], "primaryPattern": factors[0]["pattern"] if factors else "rapid-inflow-outflow", "riskScore": row["risk_score"], "riskLevel": row["risk_level"], "flaggedVolume": d.get("flaggedVolume", 0), "currency": d.get("currency", "units"), "transactionCount": d.get("totalTransactionCount", len(d.get("transactions", []))), "status": "resolved" if row["status"] != "open" else "new", "detectedAt": row["created_at"]})
        return sorted(results, key=lambda x: (-x["riskScore"], x["detectedAt"]))


@app.get("/api/investigations")
def investigations(_: dict[str, str] = Depends(authenticate)):
    with db() as c: return [summary_case(r) for r in case_rows(c)]


@app.get("/api/investigations/{case_id}")
def investigation(case_id: str, _: dict[str, str] = Depends(authenticate)):
    with db() as c:
        row = c.execute("SELECT * FROM cases WHERE id=? OR case_number=?", (case_id, case_id)).fetchone()
        if not row: raise HTTPException(404, "Investigation not found")
        return row_to_detail(row)


class Decision(BaseModel):
    decision: str = Field(pattern="^(confirmed|cleared)$")
    note: str | None = Field(default=None, max_length=2000)
    analyst: str | None = Field(default=None, max_length=100)


@app.post("/api/investigations/{case_id}/decision")
def decide(case_id: str, request: Decision, user: dict[str, str] = Depends(require_analyst)):
    with db() as c:
        row = c.execute("SELECT * FROM cases WHERE id=? OR case_number=?", (case_id, case_id)).fetchone()
        if not row: raise HTTPException(404, "Investigation not found")
        if row["status"] != "open": raise HTTPException(409, "This investigation has already been decided")
        decided = iso_now(); actor = user["actor"][:100]
        payload = {"caseId": row["id"], "decision": request.decision, "decidedBy": actor, "decidedAt": decided, "note": request.note, "case": json.loads(row["detail_json"])}
        digest = hashlib.sha256(json_dump(payload).encode()).hexdigest()
        chain = blockchain_anchor(digest)
        audit_id = str(uuid.uuid4())
        c.execute("UPDATE cases SET status=?,updated_at=? WHERE id=?", (request.decision, decided, row["id"]))
        c.execute("INSERT INTO audits(id,case_id,decision,decided_by,decided_at,note,result_hash,tx_hash,chain_id,block_number,verification_status,verified_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", (audit_id, row["id"], request.decision, actor, decided, request.note, digest, chain["tx"], chain["chain"], chain["block"], chain["status"], chain["verifiedAt"]))
        c.execute("INSERT INTO audit_log(actor,action,entity_id,event_at,detail_json) VALUES(?,?,?,?,?)", (user["actor"], "case.decision", row["id"], decided, json_dump({"decision": request.decision, "resultHash": digest, "anchorStatus": chain["status"]})))
        updated = c.execute("SELECT * FROM cases WHERE id=?", (row["id"],)).fetchone()
        return {"investigation": row_to_detail(updated), "audit": audit_json(c.execute("SELECT * FROM audits WHERE id=?", (audit_id,)).fetchone())}


@app.get("/api/audit")
def audit(_: dict[str, str] = Depends(authenticate)):
    with db() as c: return [audit_json(a) for a in c.execute("SELECT * FROM audits ORDER BY decided_at DESC").fetchall()]


@app.get("/api/audit/{case_id}/verify")
def verify_audit(case_id: str, _: dict[str, str] = Depends(authenticate)):
    with db() as c:
        a = c.execute("SELECT * FROM audits WHERE case_id=? ORDER BY decided_at DESC LIMIT 1", (case_id,)).fetchone()
        if not a: raise HTTPException(404, "No audit commitment found")
        rec = audit_json(a)
        payload = {"caseId": a["case_id"], "decision": a["decision"], "decidedBy": a["decided_by"], "decidedAt": a["decided_at"], "note": a["note"], "case": json.loads(c.execute("SELECT detail_json FROM cases WHERE id=?", (a["case_id"],)).fetchone()[0])}
        local_hash = hashlib.sha256(json_dump(payload).encode()).hexdigest()
        rec["offchainHashMatches"] = secrets_equal(local_hash, a["result_hash"])
        verified_block = independently_verify_anchor(a["result_hash"], a["tx_hash"], a["chain_id"], a["block_number"]) if rec["offchainHashMatches"] else None
        rec["onChainVerified"] = verified_block is not None
        rec["verified"] = rec["offchainHashMatches"] and rec["onChainVerified"]
        still_pending = a["verification_status"] == "pending" and bool(a["tx_hash"]) and verified_block is None
        status = "verified" if rec["verified"] else "pending" if still_pending else "failed"
        with db() as c2:
            c2.execute("UPDATE audits SET verification_status=?,verified_at=?,block_number=CASE WHEN ? IS NULL THEN block_number ELSE ? END WHERE id=?", (status, iso_now() if rec["verified"] else None, verified_block, verified_block, a["id"]))
        rec["verificationStatus"] = status
        if verified_block is not None: rec["blockNumber"] = verified_block
        return rec


@app.post("/api/uploads")
async def upload(file: UploadFile = File(...), source_id: str = Query(default="auto"), user: dict[str, str] = Depends(require_analyst)):
    if not file.filename or not file.filename.lower().endswith(".csv"): raise HTTPException(400, "Upload a CSV file")
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES: raise HTTPException(413, f"File exceeds the {MAX_UPLOAD_BYTES // (1024*1024)} MB limit")
    try: text = raw.decode("utf-8-sig")
    except UnicodeDecodeError: raise HTTPException(400, "CSV must be UTF-8 encoded")
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []
    if len(headers) < 2: raise HTTPException(422, "CSV must include a header row and at least two columns")
    normalized_headers = [normalize(h) for h in headers]
    if any(not h for h in normalized_headers) or len(normalized_headers) != len(set(normalized_headers)):
        raise HTTPException(422, "CSV headers must be non-empty and unique after normalization")
    rows: list[dict[str, str]] = []
    try:
        for row in reader:
            if len(rows) >= MAX_ROWS: raise HTTPException(413, f"CSV exceeds the {MAX_ROWS} row processing limit")
            if row and None in row: raise HTTPException(422, "CSV row has more fields than its header")
            if row and any(v is None for v in row.values()): raise HTTPException(422, "CSV row has fewer fields than its header")
            if row and any(str(v or "").strip() for v in row.values()): rows.append({str(k): str(v or "").strip() for k, v in row.items() if k is not None})
    except csv.Error as e: raise HTTPException(422, f"Invalid CSV: {e}")
    if not rows: raise HTTPException(422, "CSV contains no data rows")
    if source_id == "auto":
        norms = {normalize(h) for h in headers}
        source_id = "paysim" if {"nameorig", "namedest", "isfraud"} <= norms else "yogeshtekawade" if "transactiondate" in norms and "investmentamount" in norms else "thuandao"
    if source_id not in DATASETS: raise HTTPException(400, "Unknown dataset profile")
    profile = DATASETS[source_id]; mapping = map_columns(headers, profile)
    if not mapping.get("amount"): raise HTTPException(422, "No transaction amount field recognized. Upload a source transaction CSV containing amount/transaction_amount.")
    if not mapping.get("source"): mapping["source"] = None
    if not mapping.get("target"): mapping["target"] = None
    row_total = len(rows); row_hashes = [hashlib.sha256(json_dump(r).encode()).hexdigest() for r in rows]
    with db() as c:
        existed: set[str] = set()
        for start in range(0, len(row_hashes), 500):
            chunk = row_hashes[start:start+500]
            placeholders = ",".join("?" for _ in chunk)
            existed.update(x[0] for x in c.execute(f"SELECT row_hash FROM seen_rows WHERE source_id=? AND row_hash IN ({placeholders})", [source_id, *chunk]).fetchall())
    unique_indices = []
    for i, row_hash in enumerate(row_hashes):
        if row_hash not in existed:
            unique_indices.append(i)
            existed.add(row_hash)
    duplicate_count = row_total - len(unique_indices)
    if not unique_indices: raise HTTPException(409, "All rows in this upload are duplicates of previously ingested data")
    amount_header = mapping.get("amount")
    fresh_indices = [i for i in unique_indices if number(rows[i].get(amount_header or "")) is not None and number(rows[i].get(amount_header or "")) >= 0]
    invalid_count = len(unique_indices) - len(fresh_indices)
    if not fresh_indices: raise HTTPException(422, "No rows have a valid non-negative transaction amount")
    fresh = [rows[i] for i in fresh_indices]
    scored, metrics = score_batch(fresh, mapping, profile)
    batch_id = "bat_" + uuid.uuid4().hex[:12]; now = iso_now()
    labeled_count = sum(x["label"] is not None for x in scored); fraud_count = sum(x["label"] == 1 for x in scored)
    source_file_hash = hashlib.sha256(raw).hexdigest()
    artifact_bundle = metrics.pop("_artifactBundle", None)
    artifact_path, artifact_hash, artifact_status = persist_model_artifact(artifact_bundle)
    metrics["modelArtifactStatus"] = artifact_status
    try:
        import sklearn, numpy
        library_versions = {"scikit-learn": sklearn.__version__, "numpy": numpy.__version__}
    except Exception:
        library_versions = {}
    model_name = "RandomForestClassifier" if metrics.get("status") == "evaluated" else metrics.get("anomalyModel", "rules-only")
    manifest = {"format": "muletrace-model-run-manifest-v1", "model": model_name, "pipeline": "muletrace-fraud-v1", "sourceProfile": source_id, "sourceFileSha256": source_file_hash, "batchId": batch_id, "featureSchema": metrics.get("features", []), "mappedHeaders": mapping, "targetHeader": mapping.get("label"), "labeledRows": labeled_count, "positiveLabels": fraud_count, "artifactSha256": artifact_hash, "artifactStatus": artifact_status, "libraries": library_versions, "configuration": {"seed": 31, "randomForestTrees": 100, "randomForestMinSamplesLeaf": 2, "randomForestClassWeight": "balanced_subsample", "isolationForestTrees": 100, "alertThreshold": int(os.getenv("MULETRACE_ALERT_THRESHOLD", "65")), "ruleOutlierRobustScale": 4, "fanInOutMinimum": 5}}
    model_digest = hashlib.sha256(json_dump(manifest).encode()).hexdigest()
    model_version_id = "mv_" + model_digest[:24]
    metrics["modelVersion"] = {"versionId": model_version_id, "sha256": model_digest, "model": model_name, "artifactSha256": artifact_hash, "artifactStatus": artifact_status, "commitmentType": "training-run manifest including estimator artifact hash when artifact persistence succeeds"}
    currency_col = mapping.get("currency")
    def row_currency(row: dict[str, str]) -> str:
        observed = str(row.get(currency_col or "") or "").strip()
        return observed.upper() if observed else "units"
    new_case_indices = [i for i,x in enumerate(scored) if x["score"] >= int(os.getenv("MULETRACE_ALERT_THRESHOLD", "65"))]
    header_map = mapping
    with db() as c:
        c.execute("INSERT INTO batches VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (batch_id, file.filename[:255], source_id, now, row_total, len(fresh), duplicate_count, invalid_count, header_map.get("label"), labeled_count, fraud_count, json_dump(header_map), json_dump(metrics), json_dump({"sourceUrl": profile["url"], "uploadedBy": user["actor"], "sha256": source_file_hash, "schemaHeaders": headers})))
        c.execute("INSERT INTO model_versions(version_id,batch_id,digest,model_name,manifest_json,artifact_path,chain_id) VALUES(?,?,?,?,?,?,?)", (model_version_id,batch_id,model_digest,model_name,json_dump(manifest),artifact_path,os.getenv("MULETRACE_CHAIN_ID","unconfigured")))
        for i in fresh_indices:
            c.execute("INSERT INTO seen_rows VALUES(?,?,?)", (row_hashes[i], batch_id, source_id))
        for row, result in zip(fresh, scored):
            def identifier_fingerprint(column: str | None) -> str | None:
                raw_id = str(row.get(column or "") or "").strip()
                return fingerprint_identifier(raw_id) if raw_id else None
            c.execute("INSERT INTO normalized_flows(batch_id,source_id,source_fingerprint,target_fingerprint,amount,currency,risk_score,inserted_at) VALUES(?,?,?,?,?,?,?,?)", (batch_id, source_id, identifier_fingerprint(header_map.get("source")), identifier_fingerprint(header_map.get("target")), number(row.get(header_map["amount"])) or 0.0, row_currency(row), result["score"], now))
        # Create one human-review investigation per distinct observed subject and currency; rows without account IDs stay separate.
        grouped: dict[tuple[str, str, str], list[int]] = defaultdict(list)
        for i in new_case_indices:
            s, d = header_map.get("source"), header_map.get("target")
            observed_subject = (fresh[i].get(s or "") or fresh[i].get(d or "") or "").strip()
            subject = observed_subject or "Account unavailable"
            group_key = observed_subject or f"unlinked-row-{i}"
            grouped[(subject, row_currency(fresh[i]), group_key)].append(i)
        for (subject, case_currency, _group_key), indexes in grouped.items():
            best = max(indexes, key=lambda i: scored[i]["score"]); best_score = scored[best]["score"]
            relevant = indexes[:100]
            txs = []
            acc_stats: dict[str, dict[str, Any]] = {}
            edge_stats: dict[tuple[str,str], dict[str, Any]] = {}
            factor_acc: dict[str, dict[str, Any]] = {}
            for i in relevant:
                r, rs = fresh[i], scored[i]
                source_name = str(r.get(header_map.get("source") or "") or "Account unavailable")
                target_name = str(r.get(header_map.get("target") or "") or "Account unavailable")
                amt = number(r.get(header_map["amount"])) or 0.0
                txid = str(r.get(header_map.get("transaction_id") or "") or f"{batch_id}-{fresh_indices[i]+1}")
                timestamp = parse_time(r.get(header_map.get("time") or ""), header_map.get("time"))
                currency = row_currency(r)
                txs.append({"id": txid, "sourceAccountId": source_name, "targetAccountId": target_name, "amount": amt, "currency": currency, "timestamp": timestamp, "signals": [f["pattern"] for f in rs["factors"]]})
                for account, role, inflow, outflow in [(source_name,"source",0,amt),(target_name,"destination",amt,0)]:
                    a = acc_stats.setdefault(account,{"id":account,"riskScore":rs["score"],"riskLevel":rs["riskLevel"],"transactionCount":0,"totalInflow":0.0,"totalOutflow":0.0,"currency":currency,"firstSeen":timestamp,"lastSeen":timestamp,"role":"subject" if account==subject else role})
                    a["transactionCount"] += 1; a["totalInflow"] += inflow; a["totalOutflow"] += outflow
                    a["firstSeen"] = min(a["firstSeen"],timestamp); a["lastSeen"] = max(a["lastSeen"],timestamp)
                edge = edge_stats.setdefault((source_name,target_name),{"ids":[],"amount":0.0}); edge["ids"].append(txid); edge["amount"] += amt
                for f in rs["factors"]: factor_acc[f["id"]] = f
            accounts=list(acc_stats.values()); nodes=[{"id":a["id"]} for a in accounts]
            edges=[{"id":f"edge-{j}","source":k[0],"target":k[1],"transactionIds":v["ids"],"totalAmount":v["amount"]} for j,(k,v) in enumerate(edge_stats.items())]
            factors=list(factor_acc.values())
            case_id="inv_"+uuid.uuid4().hex[:10]; case_num=f"MT-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:6].upper()}"
            tx_volume=sum((number(fresh[i].get(header_map["amount"])) or 0.0) for i in indexes)
            detail={"subjectAccountId":subject,"summary":"; ".join(f["title"] for f in factors) or "Elevated anomaly score; analyst review required.","riskFactors":factors,"accounts":accounts,"transactions":txs,"totalTransactionCount":len(indexes),"totalAccountCount":len({str((fresh[i].get(header_map.get("source") or "") or "").strip()) for i in indexes if str((fresh[i].get(header_map.get("source") or "") or "").strip())} | {str((fresh[i].get(header_map.get("target") or "") or "").strip()) for i in indexes if str((fresh[i].get(header_map.get("target") or "") or "").strip())}),"evidenceTruncated":len(indexes)>len(relevant),"graph":{"focusAccountId":subject,"nodes":nodes,"edges":edges},"datasetName":file.filename,"flaggedVolume":tx_volume,"currency":case_currency,"prediction":{"score":best_score,"modelScore":scored[best]["modelScore"],"label": "predicted-risk" if scored[best]["label"] != 1 else "dataset-labeled-fraud", "confirmed":False,"sourceLabel":scored[best]["label"],"featureAttributions":scored[best].get("featureAttributions",[])}}
            c.execute("INSERT INTO cases VALUES(?,?,?,?,?,?,?,?,?)",(case_id,case_num,"open",best_score,risk_level(best_score),json_dump(detail),now,now,batch_id))
        c.execute("INSERT INTO audit_log(actor,action,entity_id,event_at,detail_json) VALUES(?,?,?,?,?)",(user["actor"],"dataset.ingest",batch_id,now,json_dump({"source":source_id,"rows":row_total,"processed":len(fresh),"duplicates":duplicate_count,"sha256":hashlib.sha256(raw).hexdigest()})))
    return {"id": batch_id, "fileName": file.filename, "sizeBytes": len(raw), "status": "completed", "rowsTotal": row_total, "rowsProcessed": len(fresh), "alertsCreated": len(grouped), "investigationsCreated": len(grouped), "createdAt": now, "completedAt": iso_now(), "duplicates": duplicate_count, "invalid": invalid_count, "sourceId": source_id, "labelColumn": mapping.get("label"), "labeledRows": labeled_count, "fraudLabels": fraud_count, "modelMetrics": metrics}


@app.get("/api/audit-log")
def audit_log(_: dict[str, str] = Depends(authenticate)):
    with db() as c: return [{"actor": r["actor"], "action": r["action"], "entityId": r["entity_id"], "eventAt": r["event_at"], "detail": json.loads(r["detail_json"])} for r in c.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT 1000").fetchall()]
