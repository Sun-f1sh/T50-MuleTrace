import csv, io, os, sys, tempfile, unittest
from pathlib import Path
from fastapi.testclient import TestClient
TMP=tempfile.TemporaryDirectory()
os.environ["MULETRACE_DB"]=str(Path(TMP.name)/"cross.sqlite3")
os.environ["MULETRACE_ENV"]="development"
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import main
class CrossSourceTests(unittest.TestCase):
 def setUp(self):
  main.DB_PATH = Path(os.environ["MULETRACE_DB"])
  main.DB_PATH = Path(os.environ["MULETRACE_DB"])
  main.DB_PATH=Path(os.environ["MULETRACE_DB"])
  Path(os.environ["MULETRACE_DB"]).unlink(missing_ok=True)
  main.init_db(); self.client=TestClient(main.app)
 def test_matching_uses_redacted_hmac_and_warns_against_false_merge(self):
  paysim=b"step,type,amount,nameOrig,nameDest,isFraud\n1,TRANSFER,100,SHARED-CANDIDATE-739,receiver-a,0\n"
  thuandao=b"transaction_id,source_account,target_account,amount,date\nt-1,source-b,SHARED-CANDIDATE-739,120,2026-01-02\n"
  a=self.client.post("/api/uploads?source_id=paysim",files={"file":("a.csv",paysim,"text/csv")})
  b=self.client.post("/api/uploads?source_id=thuandao",files={"file":("b.csv",thuandao,"text/csv")})
  self.assertEqual(a.status_code,200,a.text); self.assertEqual(b.status_code,200,b.text)
  result=self.client.get("/api/intelligence/cross-source").json()
  self.assertEqual(result["candidateCount"],1)
  candidate=result["candidateMatches"][0]
  self.assertEqual(set(candidate["sourceProfiles"]),{"paysim","thuandao"})
  self.assertNotIn("SHARED-CANDIDATE-739",str(result))
  self.assertIn("not proof",candidate["interpretation"])
  self.assertIn("do not merge",result["limitation"])
if __name__=="__main__":unittest.main()
