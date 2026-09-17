#!/usr/bin/env python3
"""Optional IndexNow ping for Bing and participating engines.

Does not replace sitemap/crawl hygiene. No-ops without INDEXNOW_KEY.
Key file must be publicly reachable at https://www.structuro.eu/{key}.txt
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

HOST = "www.structuro.eu"
ENDPOINT = "https://api.indexnow.org/indexnow"


def main() -> int:
    key = os.environ.get("INDEXNOW_KEY", "").strip()
    if not key:
        print("indexnow: skipped (set INDEXNOW_KEY to enable)")
        return 0
    urls = [arg for arg in sys.argv[1:] if arg.startswith("http")]
    if not urls:
        print("usage: INDEXNOW_KEY=... python3 scripts/seo/indexnow.py https://www.structuro.eu/...")
        return 1
    payload = {
        "host": HOST,
        "key": key,
        "keyLocation": f"https://{HOST}/{key}.txt",
        "urlList": urls,
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            print(f"indexnow: {resp.status} {len(urls)} urls")
    except urllib.error.HTTPError as exc:
        print(f"indexnow: HTTP {exc.code}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
