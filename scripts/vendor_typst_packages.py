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
CHECKSUMS = TARGET / "checksums.txt"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def check() -> None:
    """Verify the committed archives against checksums.txt."""
    failures = 0
    for line in CHECKSUMS.read_text().splitlines():
        expected, archive = line.split("  ")
        status = "OK" if sha256((TARGET / archive).read_bytes()) == expected else "FAILED"
        failures += status == "FAILED"
        print(f"{archive}: {status}")
    if failures:
        sys.exit(f"{failures} archive(s) do not match checksums.txt")


def main() -> None:
    if "--check" in sys.argv:
        check()
        return

    TARGET.mkdir(exist_ok=True)
    checksums = []
    for name, version in PACKAGES.items():
        archive = f"{name}-{version}.tar.gz"

        with urllib.request.urlopen(f"{REGISTRY}/{archive}") as response:
            data = response.read()

        (TARGET / archive).write_bytes(data)
        checksums.append(f"{sha256(data)}  {archive}")

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

        print(f"{archive}: {len(data)} bytes")

    CHECKSUMS.write_text("\n".join(checksums) + "\n")
    print(f"wrote {CHECKSUMS.relative_to(TARGET.parent)}")


if __name__ == "__main__":
    main()
