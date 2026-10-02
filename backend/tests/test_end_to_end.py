import csv
import json
import hashlib
from unittest.mock import patch
import io
import os
import tempfile
import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
TMP = tempfile.TemporaryDirectory()
os.environ["MULETRACE_DB"] = str(Path(TMP.name) / "e2e.sqlite3")
os.environ["MULETRACE_ENV"] = "development"
import main

class EndToEndTests(unittest.TestCase):
 def setUp(self):
  main.DB_PATH = Path(os.environ["MULETRACE_DB"])
  Path(os.environ["MULETRACE_DB"]).unlink(missing_ok=True)
  main.init_db()
  self.client = TestClient(main.app)
 def test_upload_to_prediction_human_decision_and_offchain_verify(self):
  buf=io.StringIO(); w=csv.writer(buf); w.writerow(["step","type","amount","nameOrig","nameDest","isFraud"])
  for i in range(80):
   fraud=1 if i%2 else 0
   w.writerow([i+1,"TRANSFER" if fraud else "PAYMENT", 900000+i if fraud else 25+i, f"src{i}",f"dst{i}",fraud])
  payload=buf.getvalue().encode()
  r=self.client.post("/api/uploads?source_id=paysim",files={"file":("fixture.csv",payload,"text/csv")})
  self.assertEqual(r.status_code,200,r.text)
  result=r.json(); self.assertEqual(result["status"],"completed"); self.assertEqual(result["rowsProcessed"],80)
  self.assertEqual(result["labeledRows"],80); self.assertEqual(result["fraudLabels"],40)
  evaluations=self.client.get("/api/model/metrics").json()["evaluations"]
  self.assertEqual(evaluations[0]["status"],"evaluated")
  for metric in ["precision","recall","f1","prAuc","rocAuc"]: self.assertIsInstance(evaluations[0][metric],float)
  self.assertGreaterEqual(evaluations[0]["rocAuc"],0.0); self.assertLessEqual(evaluations[0]["rocAuc"],1.0)
  model_version=evaluations[0]["modelVersion"]
  self.assertEqual(len(model_version["sha256"]),64)
  with main.db() as conn:
   persisted=conn.execute("SELECT * FROM model_versions WHERE version_id=?",(model_version["versionId"],)).fetchone()
   manifest=json.loads(persisted["manifest_json"])
   self.assertEqual(hashlib.sha256(main.json_dump(manifest).encode()).hexdigest(),persisted["digest"])
   self.assertTrue(persisted["artifact_path"] and Path(persisted["artifact_path"]).exists())
   self.assertEqual(Path(persisted["artifact_path"]).stat().st_mode & 0o777,0o600)
   artifact_hash=hashlib.sha256(Path(persisted["artifact_path"]).read_bytes()).hexdigest()
   self.assertEqual(artifact_hash,manifest["artifactSha256"])
  versions=self.client.get("/api/model/metrics").json()["versions"]
  self.assertEqual(versions[0]["sha256"],model_version["sha256"])
  cases=self.client.get("/api/investigations").json(); self.assertTrue(cases)
  case_id=cases[0]["id"]
  detail=self.client.get(f"/api/investigations/{case_id}").json()
  self.assertEqual(detail["status"],"open"); self.assertFalse(detail["prediction"]["confirmed"])
  self.assertEqual(detail["currency"],"units")
  self.assertTrue(str(detail["transactions"][0]["timestamp"]).startswith("step:"))
  self.assertGreaterEqual(detail["totalTransactionCount"],len(detail["transactions"]))
  self.assertTrue(detail["riskFactors"])
  self.assertIn("featureAttributions",detail["prediction"])
  decision=self.client.post(f"/api/investigations/{case_id}/decision",json={"decision":"confirmed","analyst":"Test Analyst","note":"fixture review"})
  self.assertEqual(decision.status_code,200,decision.text)
  audit=decision.json()["audit"]
  self.assertEqual(len(audit["resultHash"]),64)
  self.assertNotEqual(audit["verificationStatus"],"verified")
  verify=self.client.get(f"/api/audit/{case_id}/verify")
  self.assertEqual(verify.status_code,200,verify.text)
  self.assertTrue(verify.json()["offchainHashMatches"])
  self.assertFalse(verify.json()["onChainVerified"])
  self.assertFalse(verify.json()["verified"])
  self.assertEqual(verify.json()["verificationStatus"],"failed")
  # A later alteration to the stored evidence must fail the off-chain commitment check.
  with main.db() as conn:
   detail=json.loads(conn.execute("SELECT detail_json FROM cases WHERE id=?",(case_id,)).fetchone()[0])
   detail["summary"]="tampered fixture summary"
   conn.execute("UPDATE cases SET detail_json=? WHERE id=?",(main.json_dump(detail),case_id))
  tampered=self.client.get(f"/api/audit/{case_id}/verify").json()
  self.assertFalse(tampered["offchainHashMatches"])
  self.assertFalse(tampered["verified"])
  self.assertEqual(self.client.get("/api/dashboard/summary").json()["confirmedInvestigations"],1)
  duplicate=self.client.post("/api/uploads?source_id=paysim",files={"file":("duplicate.csv",payload,"text/csv")})
  self.assertEqual(duplicate.status_code,409)
 def test_same_upload_deduplicates_repeated_rows_without_failing(self):
  payload=b"transaction_id,customer_id,transaction_amount\nt1,c1,50\nt1,c1,50\n"
  result=self.client.post("/api/uploads?source_id=yogeshtekawade",files={"file":("duplicates.csv",payload,"text/csv")})
  self.assertEqual(result.status_code,200,result.text)
  self.assertEqual(result.json()["rowsTotal"],2)
  self.assertEqual(result.json()["rowsProcessed"],1)
  self.assertEqual(result.json()["duplicates"],1)
 def test_model_version_anchor_is_admin_only_and_fails_closed_without_evm(self):
  payload=b"transaction_id,customer_id,transaction_amount\nt1,c1,50\n"
  upload=self.client.post("/api/uploads?source_id=yogeshtekawade",files={"file":("version.csv",payload,"text/csv")})
  self.assertEqual(upload.status_code,200,upload.text)
  version=self.client.get("/api/model/metrics").json()["versions"][0]
  tokens={"analyst":"test-analyst-token","admin":"test-admin-token"}
  with patch.dict(os.environ,{"MULETRACE_API_TOKENS":json.dumps(tokens)}):
   denied=self.client.post(f"/api/model/versions/{version['versionId']}/anchor",headers={"Authorization":"Bearer test-analyst-token"},json={})
   self.assertEqual(denied.status_code,403)
   no_chain=self.client.post(f"/api/model/versions/{version['versionId']}/anchor",headers={"Authorization":"Bearer test-admin-token"},json={})
   self.assertEqual(no_chain.status_code,503)
   check=self.client.get(f"/api/model/versions/{version['versionId']}/verify",headers={"Authorization":"Bearer test-analyst-token"})
   self.assertEqual(check.status_code,200)
   self.assertFalse(check.json()["verified"])
   self.assertEqual(check.json()["verificationStatus"],"not_anchored")
 def test_yogesh_profile_does_not_invent_labels(self):
  payload=b"Transaction_ID,Customer_ID,Transaction_Amount,Transaction_Date,Account_Type\nt1,c1,50,2026-01-01,Savings\n"
  r=self.client.post("/api/uploads?source_id=yogeshtekawade",files={"file":("transactions.csv",payload,"text/csv")})
  self.assertEqual(r.status_code,200,r.text)
  self.assertIsNone(r.json()["labelColumn"])
  self.assertEqual(r.json()["labeledRows"],0)
  self.assertEqual(r.json()["modelMetrics"]["status"],"not_evaluated")

if __name__=="__main__": unittest.main()
