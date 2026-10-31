# Capture the annotated help screenshots from the REAL app and their callout
# geometry. Usage (see README.md):
#   python scripts/help-shots/capture.py <workdir> <repo> [only,names] [theme]
import sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
import lib
from lib import SHOTS, ONLY, WRITE, GEO, GEO_FILE, sync_playwright, json
import shots_teach, shots_dashboards, shots_company  # noqa: F401 (register their shots)

if __name__ == '__main__':
  with sync_playwright() as p:
    b = p.chromium.launch()
    for name, fn in SHOTS.items():
        if ONLY and name not in ONLY: continue
        try: fn(b)
        except Exception as e: print('FAILED', name, str(e)[:300])
    b.close()
  if WRITE: GEO_FILE.write_text(json.dumps(GEO, indent=1))

