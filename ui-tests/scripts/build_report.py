#!/usr/bin/env python3
# Copyright (c) Agriya Khetarpal
# SPDX-License-Identifier: BSD-3-Clause
"""
A script to assemble ui-tests/pdf-output/ into a self-contained HTML report.
See test-report-redirect.yml for how this is used in CI. The report is to
be uploaded as an artifact and linked to from a PR.

We inline quite literally everything as data URIs.

The layout copies Playwright's HTML reporter. Its stylesheets are vendored
verbatim, except that we lay the PDF previews out as a grid of cards rather
than a list of rows.

Test outcomes and durations come from results.json, which we produce via the
JSON reporter in Playwright. See
https://playwright.dev/docs/test-reporters#json-reporter
"""

from __future__ import annotations

import base64
import html
import json
import string
import sys
from datetime import datetime
from pathlib import Path
from string.templatelib import Interpolation, Template

HERE = Path(__file__).resolve().parent
OUTPUT_DIR = HERE.parent / "pdf-output"
RESULTS = HERE.parent / "test-results" / "results.json"
TEMPLATE = HERE / "report_template.html"
REPORT = HERE.parent / "report.html"

VENDOR = HERE / "vendor" / "playwright-html-reporter"
STYLESHEETS = [
    VENDOR
    / "colors.css",  # custom properties are read from this one. keep this at the first
    VENDOR / "common.css",
    VENDOR / "chip.css",
    VENDOR / "headerView.css",
    VENDOR / "testFileView.css",
    VENDOR / "reportView.css",
    VENDOR / "theme.css",
    HERE / "report.css",
]
SCRIPT = HERE / "report.js"


def render(template: Template) -> str:
    out = []
    for item in template:
        if isinstance(item, Interpolation):
            value = item.value
            out.append(value if isinstance(value, Markup) else html.escape(str(value)))
        else:
            out.append(item)
    return "".join(out)


class Markup(str):
    """A string that is safe to drop into HTML without escaping"""

    pass


def markup(template: Template) -> Markup:
    return Markup(render(template))


def join(parts: list[Markup]) -> Markup:
    return Markup("".join(parts))


def data_uri(payload: bytes, mime: str) -> Markup:
    return Markup(f"data:{mime};base64,{base64.b64encode(payload).decode()}")


def ms_to_string(ms: float) -> str:
    """A port of Playwright's msToString"""
    if ms < 0:
        return "-"
    if ms == 0:
        return "0ms"
    if ms < 1000:
        return f"{ms:.0f}ms"
    seconds = ms / 1000
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = seconds / 60
    if minutes < 60:
        return f"{minutes:.1f}m"
    hours = minutes / 60
    if hours < 24:
        return f"{hours:.1f}h"
    return f"{hours / 24:.1f}d"


# From html-reporter/src/icons.tsx
def _octicon(classes: str, path: str, size: int = 16, box: int = 16) -> Markup:
    return Markup(
        f'<svg aria-hidden="true" class="{classes}" viewBox="0 0 {box} {box}" '
        f'width="{size}" height="{size}"><path fill-rule="evenodd" d="{path}">'
        f"</path></svg>"
    )


ICONS = {
    "check": _octicon(
        "octicon color-icon-success",
        "M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a."
        "75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z",
    ),
    "cross": _octicon(
        "octicon color-text-danger",
        "M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 "
        "8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1."
        "06L6.94 8 3.72 4.78a.75.75 0 010-1.06z",
    ),
    "warning": _octicon(
        "octicon color-text-warning",
        "M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25"
        ".25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l"
        "6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6."
        "457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2."
        "5a.75.75 0 001.5 0v-2.5z",
    ),
    "skip": _octicon(
        "octicon color-fg-muted",
        "M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 "
        "0-13 0Zm9.78-2.22-5.5 5.5a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-."
        "734l5.5-5.5a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z",
    ),
    "clock": _octicon(
        "octicon octicon-clock color-text-danger",
        "M5.75.75A.75.75 0 016.5 0h3a.75.75 0 010 1.5h-.75v1l-.001.041a6.718 6.718"
        " 0 013.464 1.435l.007-.006.75-.75a.75.75 0 111.06 1.06l-.75.75-.006.007a6"
        ".75 6.75 0 11-10.548 0L2.72 5.03l-.75-.75a.75.75 0 011.06-1.06l.75.75.007"
        ".006A6.718 6.718 0 017.25 2.541a.756.756 0 010-.041v-1H6.5a.75.75 0 01-.7"
        "5-.75zM8 14.5A5.25 5.25 0 108 4a5.25 5.25 0 000 10.5zm.389-6.7l1.33-1.33a"
        ".75.75 0 111.061 1.06L9.45 8.861A1.502 1.502 0 018 10.75a1.5 1.5 0 11.389"
        "-2.95z",
    ),
    "search": _octicon(
        "octicon subnav-search-icon",
        "M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 "
        "111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z",
    ),
    "downArrow": _octicon(
        "octicon color-fg-muted",
        "M12.78 6.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 7.28a.75"
        ".75 0 011.06-1.06L8 9.94l3.72-3.72a.75.75 0 011.06 0z",
    ),
    "rightArrow": _octicon(
        "octicon color-fg-muted",
        "M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.7"
        "5 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z",
    ),
}

_SETTINGS_PATH = (
    "M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c."
    "018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071"
    "l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 "
    "1.218.315.675.111 1.422-.364 "
    "1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 "
    ".772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 "
    "1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-."
    "302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 "
    "1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 "
    "1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458"
    "-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.66"
    "8-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1"
    ".82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.81"
    "5-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 "
    "0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 "
    "5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.6"
    "3l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.06"
    "6.194-.158.211-.224l.29-1.106C6.009.645 6.556.095 7.299.03 7.53.01 "
    "7.764 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 "
    "1.105c-.147.561-.549.967-.998 1.189-.173.086-.34.183-.5.29-.417.278-.9"
    "7.423-1.529.27l-1.103-.303c-.109-.03-.175.016-.195.045-.22.312-.412.64"
    "4-.573.99-.014.031-.021.11.059.19l.815.806c.411.406.562.957.53 "
    "1.456a4.709 4.709 0 0 0 0 .582c.032.499-.119 1.05-.53 1.456l-.815.806c"
    "-.081.08-.073.159-.059.19.162.346.353.677.573.989.02.03.085.076.195.04"
    "6l1.102-.303c.56-.153 1.113-.008 "
    "1.53.27.161.107.328.204.501.29.447.222.85.629.997 1.189l.289 "
    "1.105c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.03"
    "6.137-.146l.289-1.105c.147-.561.549-.967.998-1.189.173-.086.34-.183.5-"
    ".29.417-.278.97-.423 1.529-.27l1.103.303c.109.029.175-.016.195-.045.22"
    "-.313.411-.644.573-.99.014-.031.021-.11-.059-.19l-.815-.806c-.411-.406"
    "-.562-.957-.53-1.456a4.709 4.709 0 0 0 0-.582c-.032-.499.119-1.05.53-1"
    ".456l.815-.806c.081-.08.073-.159.059-.19a6.464 6.464 0 0 0-.573-.989c-"
    ".02-.03-.085-.076-.195-.046l-1.102.303c-.56.153-1.113.008-1.53-.27a4.4"
    "4 4.44 0 0 0-.501-.29c-.447-.222-.85-.629-.997-1.189l-.289-1.105c-.029"
    "-.11-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM11 8a3 3 0 1 1-6 0 3 3"
    " 0 0 1 6 0ZM9.5 8a1.5 1.5 0 1 0-3.001.001A1.5 1.5 0 0 0 9.5 8Z"
)

ICONS["settings"] = Markup(
    '<svg aria-hidden="true" class="octicon octicon-settings" '
    'viewBox="0 0 16 16" width="16" height="16">'
    f'<path d="{_SETTINGS_PATH}"></path></svg>'
)

STATUS_ICONS = {
    "passed": ICONS["check"],
    "failed": ICONS["cross"],
    "flaky": ICONS["warning"],
    "skipped": ICONS["skip"],
}


def read_results() -> dict:
    """
    Flatten Playwright's JSON report into the handful of fields we render.

    Returns a dict with the run's stats plus a list of tests in report order,
    each carrying its title, location, duration, and outcome.
    """
    if not RESULTS.exists():
        return {"tests": [], "stats": None, "started_at": None, "duration": None}

    report = json.loads(RESULTS.read_text())
    tests: list[dict] = []

    def walk(suite: dict) -> None:
        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                results = test.get("results", [])
                statuses = [result.get("status") for result in results]
                expected = test.get("expectedStatus", "passed")
                if not statuses or all(s == "skipped" for s in statuses):
                    status = "skipped"
                elif all(s == expected for s in statuses):
                    status = "passed"
                elif any(s == expected for s in statuses):
                    status = "flaky"
                else:
                    status = "failed"
                tests.append(
                    {
                        "title": spec.get("title", ""),
                        "file": spec.get("file", "?"),
                        "line": spec.get("line", 0),
                        "duration": sum(r.get("duration", 0) for r in results),
                        "status": status,
                    }
                )
        for child in suite.get("suites", []):
            walk(child)

    for suite in report.get("suites", []):
        walk(suite)

    stats = report.get("stats", {})
    return {
        "tests": tests,
        "stats": {
            "passed": stats.get("expected", 0),
            "failed": stats.get("unexpected", 0),
            "flaky": stats.get("flaky", 0),
            "skipped": stats.get("skipped", 0),
        },
        "started_at": stats.get("startTime"),
        "duration": stats.get("duration"),
    }


def read_exports() -> dict[str, dict]:
    """Map a Playwright test title to the export that test wrote, if any"""
    exports: dict[str, dict] = {}
    for path in sorted(OUTPUT_DIR.glob("*.json")):
        meta = json.loads(path.read_text())
        meta["slug"] = meta.get("slug", path.stem)
        exports[meta.get("testTitle", "")] = meta
    return exports


def build_preview(meta: dict) -> Markup:
    """The PDF page render, linked to the full PDF"""

    def read(ext: str) -> bytes | None:
        path = OUTPUT_DIR / f"{meta['slug']}.{ext}"
        return path.read_bytes() if path.exists() else None

    pdf, png = read("pdf"), read("png")
    if not (pdf and png):
        return Markup('<div class="pdf-card-no-preview">No page render captured.</div>')
    title = meta.get("title", meta["slug"])
    return markup(
        t'<a class="pdf-card-preview" href="{data_uri(pdf, "application/pdf")}" '
        t'target="_blank" rel="noopener" title="Open the full PDF">'
        t'<img loading="lazy" src="{data_uri(png, "image/png")}" '
        t'alt="First page of the PDF exported for {title}" /></a>'
    )


def build_card(test: dict, meta: dict | None) -> Markup:
    status = test["status"]
    icon = STATUS_ICONS.get(status, Markup(""))
    classes = "pdf-card"
    if status == "failed":
        classes += " pdf-card-outcome-unexpected"
    elif status == "skipped":
        classes += " test-file-test-outcome-skipped"

    if meta is None:
        # A card with no preview exported no PDF
        body = Markup("")
    else:
        size = f"{meta.get('bytes', 0) / 1024:.1f} KiB"
        dims = f"{meta.get('width', '?')} x {meta.get('height', '?')} pt"
        pages = meta.get("pageCount", "?")
        settings = meta.get("settings")
        settings_line = (
            markup(t'<code class="pdf-card-settings">{json.dumps(settings)}</code>')
            if settings
            else Markup("")
        )
        text_path = OUTPUT_DIR / f"{meta['slug']}.txt"
        text = text_path.read_text() if text_path.exists() else "(none)"
        body = markup(
            t"{build_preview(meta)}"
            t'<div class="pdf-card-meta">{meta.get("notebook", "?")} &middot; '
            t"{pages} page(s) &middot; {size} &middot; {dims}</div>"
            t"{settings_line}"
            t'<details class="pdf-card-text"><summary>Extracted text</summary>'
            t"<pre>{text}</pre></details>"
        )

    # Both are missing when we are building without results.json.
    duration = (
        markup(
            t'<span class="pdf-card-duration">{ms_to_string(test["duration"])}</span>'
        )
        if test["duration"]
        else Markup("")
    )
    location = (
        markup(
            t'<div class="test-file-details-row"><span class="test-file-path">'
            t"{test['file']}:{test['line']}</span></div>"
        )
        if test["line"]
        else Markup("")
    )

    # data-* attributes are what report.js filters and sorts on.
    return markup(
        t'<div class="{classes}" role="listitem" data-status="{status}" '
        t'data-duration="{test["duration"]}" '
        t'data-text="{test["title"].lower()}" '
        t'data-file="{test["file"]}" data-line="{test["line"]}">'
        t'<div class="pdf-card-header hbox">'
        t'<span class="test-file-test-status-icon">{icon}</span>'
        t'<span class="test-file-title">{test["title"]}</span>'
        t"{duration}</div>"
        t"{location}"
        t"{body}</div>"
    )


def build_chip(index: int, header: str, cards: list[Markup]) -> Markup:
    """A collapsible section, one per spec file, holding a grid of cards"""
    body_id = f"chip-body-{index}"
    return markup(
        t'<div class="chip" data-file-chip>'
        t'<div role="button" aria-expanded="true" aria-controls="{body_id}" '
        t'class="chip-header expanded-true" title="{header}">'
        t'<span class="chip-arrow-down">{ICONS["downArrow"]}</span>'
        t'<span class="chip-arrow-right" hidden>{ICONS["rightArrow"]}</span>'
        t'<span class="chip-header-allow-selection">{header}</span></div>'
        t'<div id="{body_id}" role="region" class="chip-body chip-body-no-insets">'
        t'<div class="pdf-grid" role="list">{join(cards)}</div></div></div>'
    )


def build_nav(stats: dict[str, int] | None) -> Markup:
    counts = stats or {"passed": 0, "failed": 0, "flaky": 0, "skipped": 0}
    total = counts["passed"] + counts["failed"] + counts["flaky"]
    links = [
        markup(
            t'<a class="subnav-item" href="#?" data-token="">'
            t'<span class="subnav-item-label">All</span>'
            t'<span class="d-inline counter">{total}</span></a>'
        )
    ]
    for token in ("passed", "failed", "flaky", "skipped"):
        count = counts[token]
        icon = STATUS_ICONS[token] if count else Markup("")
        links.append(
            markup(
                t'<a class="subnav-item" href="#?q=s:{token}" data-token="s:{token}">'
                t'{icon}<span class="subnav-item-label">{token.capitalize()}</span>'
                t'<span class="d-inline counter">{count}</span></a>'
            )
        )
    links.append(
        markup(
            t'<a class="subnav-item" id="speedboard-link" href="#?speedboard" '
            t'title="Speedboard">{ICONS["clock"]}</a>'
        )
    )
    links.append(
        markup(
            t'<div role="button" class="subnav-item" id="settings-button" '
            t'title="Settings" style="cursor: pointer">{ICONS["settings"]}</div>'
        )
    )
    return markup(t"<nav>{join(links)}</nav>")


def main() -> int:
    if not OUTPUT_DIR.exists():
        print(f"No {OUTPUT_DIR}; run the Playwright tests first.", file=sys.stderr)
        return 1

    results = read_results()
    exports = read_exports()
    tests = results["tests"]

    if not tests:
        # No results.json is present. Let's fall back to whatever exports are on disk.
        # There are no outcomes or durations to show in that case, so something went wrong.
        print(
            f"No {RESULTS}; building from exports alone, without pass or fail state.",
            file=sys.stderr,
        )
        tests = [
            {
                "title": meta.get("testTitle") or meta["slug"],
                "file": meta.get("notebook", "?"),
                "line": 0,
                "duration": 0,
                "status": "unknown",
            }
            for meta in exports.values()
        ]

    # Exports whose test is missing from results.json
    seen = {test["title"] for test in tests}
    for title, meta in exports.items():
        if title not in seen:
            tests.append(
                {
                    "title": title or meta["slug"],
                    "file": meta.get("notebook", "?"),
                    "line": 0,
                    "duration": 0,
                    "status": "unknown",
                }
            )

    groups: dict[str, list[Markup]] = {}
    for test in tests:
        card = build_card(test, exports.get(test["title"]))
        groups.setdefault(test["file"], []).append(card)

    chips = [
        build_chip(index, header, cards)
        for index, (header, cards) in enumerate(groups.items())
    ]
    chips.append(
        markup(
            t'<div class="chip" id="speedboard-chip" hidden>'
            t'<div class="chip-header">'
            t'<span class="octicon" style="width: 16px; height: 16px"></span>'
            t"Slowest Tests</div>"
            t'<div role="region" class="chip-body chip-body-no-insets">'
            t'<div class="pdf-grid" id="speedboard-grid" role="list"></div>'
            t"</div></div>"
        )
    )
    chips.append(
        Markup(
            '<div class="chip-header test-file-no-files" id="no-results" hidden>'
            "No tests found</div>"
        )
    )

    started_at = results["started_at"]
    started = (
        datetime.fromisoformat(started_at).astimezone().strftime("%d/%m/%Y, %H:%M:%S")
        if started_at
        else ""
    )

    page = string.Template(TEMPLATE.read_text()).substitute(
        styles="\n".join(path.read_text() for path in STYLESHEETS),
        script=SCRIPT.read_text(),
        search_icon=ICONS["search"],
        nav=build_nav(results["stats"]),
        notice=(
            Markup("")
            if results["stats"]
            else Markup(
                "<div>No Playwright results found, so pass and fail state is "
                "unknown</div>"
            )
        ),
        started_at=started,
        started_at_iso=started_at or "",
        total_time=ms_to_string(results["duration"] or 0),
        content=join(chips),
    )
    REPORT.write_text(page)

    failed = sum(1 for test in tests if test["status"] == "failed")
    print(
        f"Wrote {REPORT} ({len(tests)} test(s), {len(exports)} export(s), "
        f"{len(page) / 1024:.1f} KiB)"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
