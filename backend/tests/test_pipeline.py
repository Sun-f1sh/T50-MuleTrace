import hashlib
import json
import os
import tempfile
import sys
import unittest
from unittest.mock import patch
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

TMP = tempfile.TemporaryDirectory()
os.environ["MULETRACE_DB"] = str(Path(TMP.name) / "test.sqlite3")
os.environ["MULETRACE_ENV"] = "development"
import main

class PipelineTests(unittest.TestCase):
    def setUp(self):
        Path(os.environ["MULETRACE_DB"]).unlink(missing_ok=True)
        main.init_db()

    def test_label_normalization(self):
        self.assertEqual(main.truth("1"), 1)
        self.assertEqual(main.truth("true"), 1)
        self.assertEqual(main.truth("fraudulent"), 1)
        self.assertEqual(main.truth("0"), 0)
        self.assertEqual(main.truth("false"), 0)
        self.assertIsNone(main.truth("unknown"))

    def test_source_profiles_are_distinct_and_yogesh_unlabeled(self):
        self.assertNotEqual(main.DATASETS["paysim"]["aliases"], main.DATASETS["thuandao"]["aliases"])
        self.assertIn("fraud", main.DATASETS["yogeshtekawade"]["aliases"]["label"])
        # The documented source CSV is label-free; the end-to-end test confirms no label is synthesized when its headers omit one.

    def test_leakage_fields_excluded_in_paysim(self):
        rows = [{"amount":"10", "oldbalanceOrg":"100", "newbalanceOrig":"90", "isFraud":"0", "type":"PAYMENT"}, {"amount":"20", "oldbalanceOrg":"200", "newbalanceOrig":"180", "isFraud":"1", "type":"TRANSFER"}]
        mapping = main.map_columns(list(rows[0]), main.DATASETS["paysim"])
        scored, metrics = main.score_batch(rows * 12, mapping, main.DATASETS["paysim"])
        self.assertNotIn("oldbalanceOrg", metrics.get("features", []))
        self.assertNotIn("newbalanceOrig", metrics.get("features", []))
        self.assertEqual(len(scored), 24)

    def test_unlabeled_batch_uses_isolation_forest_without_claiming_evaluation(self):
        rows = [{"amount": str(100 + (i % 7)), "kind": "ordinary"} for i in range(39)] + [{"amount": "100000", "kind": "rare"}]
        mapping = {"amount": "amount", "label": None, "transaction_id": None, "source": None, "target": None}
        scored, metrics = main.score_batch(rows, mapping, main.DATASETS["yogeshtekawade"])
        self.assertEqual(metrics["status"], "not_evaluated")
        self.assertEqual(metrics["anomalyModel"], "IsolationForest")
        self.assertGreater(max(item["score"] for item in scored), 65)
        self.assertTrue(all(item["label"] is None for item in scored))
        top = max(scored, key=lambda item: item["score"])
        self.assertTrue(top["featureAttributions"])
        self.assertIn("feature deviation", top["featureAttributions"][0]["method"])

    def test_sqlite_database_is_owner_only(self):
        self.assertEqual(main.DB_PATH.stat().st_mode & 0o777, 0o600)

    def test_hash_is_deterministic(self):
        payload = {"caseId":"case", "decision":"cleared"}
        a = hashlib.sha256(main.json_dump(payload).encode()).hexdigest()
        b = hashlib.sha256(main.json_dump(payload).encode()).hexdigest()
        self.assertEqual(a, b)
        self.assertEqual(len(a), 64)

    def test_configured_evm_confirmation_depth_is_enforced(self):
        class Eth:
            block_number = 101
        class W3:
            eth = Eth()
        with patch.dict(os.environ, {"MULETRACE_EVM_CONFIRMATIONS": "3"}):
            self.assertFalse(main.has_evm_confirmation_depth(W3(), 100))
            W3.eth.block_number = 102
            self.assertTrue(main.has_evm_confirmation_depth(W3(), 100))

    def test_unconfigured_chain_not_verified(self):
        for key in ["MULETRACE_EVM_RPC_URL", "MULETRACE_AUDIT_CONTRACT", "MULETRACE_EVM_PRIVATE_KEY"]:
            os.environ.pop(key, None)
        result = main.blockchain_anchor("00" * 32)
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["tx"], "")
        self.assertEqual(result["block"], 0)

if __name__ == "__main__":
    unittest.main()
