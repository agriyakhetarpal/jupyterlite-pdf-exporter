"""Download the Typst packages that the exporter bundles.

The archives in typst-packages/ are served as static assets to prevent the
Typst compiler from reaching packages.typst.org.

Usage: re-run after changing a version of any of the packages below.
"""

import hashlib
import io
import sys
import tarfile
import urllib.request
from pathlib import Path

# Keep in sync with src/typst-packages.ts
# Keep in sync with src/typst-wrapper.ts
PACKAGES = {
    "callisto": "0.3.0",
    "cmarker": "0.1.10",
    "mitex": "0.2.7",
    "based": "0.2.0",
    "percencode": "0.1.0",
}

REGISTRY = "https://packages.typst.org/preview"
TARGET = Path(__file__).resolve().parent.parent / "typst-packages"


def main() -> None:
    TARGET.mkdir(exist_ok=True)
    for name, version in PACKAGES.items():
        archive = f"{name}-{version}.tar.gz"

        with urllib.request.urlopen(f"{REGISTRY}/{archive}") as response:
            data = response.read()

        (TARGET / archive).write_bytes(data)

        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
            members = {m.name.lstrip("./"): m for m in tar.getmembers()}

            license = next(
                (m for n, m in members.items() if n.upper().startswith("LICENSE")), None
            )
            if license is None:
                sys.exit(f"{archive} has no LICENSE file")

            license_file = tar.extractfile(license)
            if license_file is None:
                sys.exit(f"{archive} LICENSE member is not a regular file")

            text = license_file.read()

        (TARGET / f"LICENSE-{name}.txt").write_bytes(text)

        digest = hashlib.sha256(data).hexdigest()[:12]
        print(f"{archive}: {len(data)} bytes, sha256 {digest}")


if __name__ == "__main__":
    main()
