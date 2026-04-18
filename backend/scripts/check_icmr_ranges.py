#!/usr/bin/env python3
"""
Pre-deploy checks for the ICMR DB JSON (path set in services.verifier).

  cd backend && python scripts/check_icmr_ranges.py
  ICMR_STRICT=1 python scripts/check_icmr_ranges.py   # exit non-zero on alias collisions

Importing services.verifier runs the same startup validation + builds ALIAS_MAP.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.chdir(BACKEND_ROOT)


def main() -> int:
    try:
        import services.verifier  # noqa: F401 — triggers _validate_icmr_db()
    except ValueError as e:
        print(e)
        return 1
    print("[check_icmr_ranges] OK — loaded verifier (see warnings above if any).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
