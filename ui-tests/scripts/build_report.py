#!/usr/bin/env python3
# Copyright (c) Agriya Khetarpal
# SPDX-License-Identifier: BSD-3-Clause
"""
A script to assemble ui-tests/pdf-output/ into a self-contained HTML report.
See test-report-redirect.yml for how this is used in CI. The report is to
be uploaded as an artifact and linked to from a PR.

We inline quite literally everything as data URIs.

The pass/fail statuses come from results.json, which we produce via the JSON
reporter in Playwright. See https://playwright.dev/docs/test-reporters#json-reporter
"""

from __future__ import annotations

import base64
import html
import json
import string
import sys
from pathlib import Path
from string.templatelib import Interpolation, Template

HERE = Path(__file__).resolve().parent
OUTPUT_DIR = HERE.parent / "pdf-output"
RESULTS = HERE.parent / "test-results" / "results.json"
TEMPLATE = HERE / "report_template.html"
REPORT = HERE.parent / "report.html"

GROUP_ORDER = ["Content", "Settings"]


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


def data_uri(payload: bytes, mime: str) -> Markup:
    return Markup(f"data:{mime};base64,{base64.b64encode(payload).decode()}")


def read_statuses() -> dict[str, str]:
    """Map a test title to its status from Playwright's JSON report"""
    if not RESULTS.exists():
        return {}
    report = json.loads(RESULTS.read_text())
    statuses: dict[str, str] = {}

    def walk(suite: dict) -> None:
        for spec in suite.get("specs", []):
            ok = all(
                result.get("status") in ("passed", "skipped")
                for test in spec.get("tests", [])
                for result in test.get("results", [])
            )
            statuses[spec["title"]] = "passed" if ok else "failed"
        for child in suite.get("suites", []):
            walk(child)

    for suite in report.get("suites", []):
        walk(suite)
    return statuses


def status_for(meta: dict, statuses: dict[str, str]) -> str:
    """
    Look a card's status up by the Playwright test title it recorded in
    its metadata. If the test title is not found, return "unknown".
    """
    return statuses.get(meta.get("testTitle", ""), "unknown")


def build_card(slug: str, statuses: dict[str, str]) -> tuple[str, Markup, str]:
    def read(ext: str) -> bytes | None:
        path = OUTPUT_DIR / f"{slug}.{ext}"
        return path.read_bytes() if path.exists() else None

    meta = json.loads((OUTPUT_DIR / f"{slug}.json").read_text())
    pdf, png, text = read("pdf"), read("png"), read("txt")
    status = status_for(meta, statuses)

    badge = {"passed": "pass", "failed": "fail"}.get(status)
    badge_html = (
        markup(t'<span class="badge {badge}">{status}</span>') if badge else Markup("")
    )

    size = f"{meta.get('bytes', 0) / 1024:.1f} KiB"
    dims = f"{meta.get('width', '?')} x {meta.get('height', '?')} pt"
    settings = meta.get("settings")
    settings_line = (
        markup(t"<br /><code>{json.dumps(settings)}</code>") if settings else Markup("")
    )

    preview = (
        markup(
            t'<a class="preview" href="{data_uri(pdf, "application/pdf")}" '
            t'target="_blank" rel="noopener">'
            t'<img loading="lazy" src="{data_uri(png, "image/png")}" '
            t'alt="First page of the PDF exported for {meta.get("title", slug)}" /></a>'
        )
        if png and pdf
        else Markup('<p class="missing">No page render captured.</p>')
    )

    card = markup(
        t'<article class="card{" failed" if status == "failed" else ""}">'
        t"<h3>{meta.get('title', slug)} {badge_html}</h3>"
        t'<p class="meta"><code>{meta.get("notebook", "?")}</code> &middot; '
        t"{meta.get('pageCount', '?')} page(s) &middot; {size} &middot; {dims}"
        t"{settings_line}</p>"
        t"{preview}"
        t"<details><summary>Extracted text</summary>"
        t"<pre>{text.decode() if text else '(none)'}</pre></details>"
        t"</article>"
    )
    return meta.get("group", "Other"), card, status


def main() -> int:
    if not OUTPUT_DIR.exists():
        print(f"No {OUTPUT_DIR}; run the Playwright tests first.", file=sys.stderr)
        return 1

    statuses = read_statuses()
    slugs = sorted(p.stem for p in OUTPUT_DIR.glob("*.json"))

    groups: dict[str, list[Markup]] = {}
    failed: list[str] = []
    for slug in slugs:
        group, card, status = build_card(slug, statuses)
        groups.setdefault(group, []).append(card)
        if status == "failed":
            failed.append(slug)

    # Tests that failed before writing anything have no card, so count them too
    missing = [title for title, status in statuses.items() if status == "failed"]

    ordered = sorted(groups, key=lambda g: (GROUP_ORDER + [g]).index(g))
    groups_html = Markup(
        "".join(
            render(
                t'<h2 class="group">{name}</h2><div class="grid">'
                t"{Markup(''.join(groups[name]))}</div>"
            )
            for name in ordered
        )
    )

    if missing:
        items = Markup(
            "".join(render(t"<li>{title}</li>") for title in sorted(missing))
        )
        banner = markup(
            t'<div class="banner fail">{len(missing)} test(s) failed'
            t"<ul>{items}</ul></div>"
        )
    elif statuses:
        banner = markup(
            t'<div class="banner pass">All {len(statuses)} test(s) passed!</div>'
        )
    else:
        banner = Markup(
            '<div class="banner fail">No Playwright results found, so pass and '
            "fail state is unknown</div>"
        )

    page = string.Template(TEMPLATE.read_text()).substitute(
        subtitle=render(
            t"This workflow ran {len(slugs)} export(s). "
            t"Click a page image to open the full PDF!"
        ),
        banner=banner,
        groups=groups_html,
    )
    REPORT.write_text(page)
    print(f"Wrote {REPORT} ({len(slugs)} export(s), {len(page) / 1024:.1f} KiB)")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
