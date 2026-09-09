// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause
//
// The Typst counterpart within jupyterlite-pdf-exporter.
// pdf.ts compiles this file together with notebook.ipynb and settings.json,
// which carries the user settings.
//
// Keep the Callisto version in sync with
// - scripts/vendor_typst_packages.py
// - src/typst-packages.ts
#import "@preview/callisto:0.3.0"

#let settings = json("settings.json")

#let units = (pt: 1pt, mm: 1mm, cm: 1cm, "in": 1in, em: 1em)

#let length(spec) = if spec == none { auto } else { spec.value * units.at(spec.unit) }

#set page(paper: settings.pageSize) if settings.pageSize != none
#set page(
  margin: (
    top: length(settings.margin.top),
    bottom: length(settings.margin.bottom),
    left: length(settings.margin.left),
    right: length(settings.margin.right),
  ),
  numbering: if settings.pageNumbers { "1" } else { none },
)
#set text(font: settings.mainFont) if settings.mainFont != none
#set text(size: length(settings.fontSize)) if settings.fontSize != none
#set par(justify: true, leading: settings.lineSpacing * 0.65em)
#show link: set text(fill: rgb(settings.linkColor)) if settings.linkColor != none
#set heading(numbering: "1.") if settings.numberSections

// Shrink tables wider than the text area so they fit the page
// This is adapted from what Pandoc does in its HTML writer
#show table: it => layout(size => {
  let width = measure(it).width
  if width > size.width {
    scale(x: size.width / width * 100%, y: size.width / width * 100%, reflow: true, it)
  } else {
    it
  }
})

// Markdown images that are neither attachments nor data URLs, such as those at
//  external URLs, point at files the compiler cannot reach from within browser
// contexts. Callisto panics at such images. We replace them with a note instead.
#let image-markdown(data, ctx: none, ..args) = {
  if type(data) == str and not data.starts-with("attachment:") and not data.starts-with("data:") {
    return text(fill: gray, size: 0.9em)[[Image not available: #raw(data)]]
  }
  (callisto.default-handlers.at("image-markdown"))(data, ctx: ctx, ..args)
}

// nbconvert and Jupyter Book conventions: use cell tags to leave cells, or their
// inputs or outputs out of an export. We honour both snake_case and kebab_case tags.
#let has-tag(cell, name) = {
  let tags = cell.at("metadata", default: (:)).at("tags", default: ())
  tags.contains(name) or tags.contains(name.replace("-", "_"))
}

#let cell-handler(cell, ctx: none, ..args) = {
  if has-tag(cell, "remove-cell") { return none }
  (callisto.default-handlers.at("cell"))(cell, ctx: ctx, ..args)
}

// Callisto decides the hiding of inputs and outputs per cell from ctx.input
// and ctx.output, which the hideInputs and hideOutputs settings set for the
// whole notebook. A tag can only hide more...
#let code-cell-handler(cell, ctx: none, ..args) = {
  let ctx = ctx
  if has-tag(cell, "remove-input") { ctx.input = false }
  if has-tag(cell, "remove-output") { ctx.output = false }
  (callisto.default-handlers.at("code-cell"))(cell, ctx: ctx, ..args)
}

// Callisto's notebook theme places the In/Out prompts 1.2em to the left of
// each code cell, see https://github.com/sijow/callisto/blob/a402a27f5aa17d4b4e45ced1bf3dcd3a7227a6dc/themes/notebook.typ#L8-L12.
// This puts them in the page margin, where they are clipped once the margin
// is narrower than the prompt. See https://github.com/sijow/callisto/issues/22
//
// This is a workaround that reserves room inside the text area, measured from
// the widest prompt the user's notebook needs at the current font. By default,
// only code cells are indented to utilise the space available efficiently.
//
// The promptGutter setting allows indenting all cells, which may be a tad more
// faithful to the notebook layout as seen in JupyterLab/nbconvert, but then
// we don't have as wide margins like nbconvert does.
#let prompt-gutter() = {
  let counts = json("notebook.ipynb")
    .cells
    .filter(cell => cell.cell_type == "code")
    .map(cell => cell.at("execution_count", default: none))
    .filter(count => count != none)
  let widest = counts.fold(1, calc.max)
  measure(raw("Out[" + str(widest) + "]:")).width + 1.2em
}

#let with-prompt-gutter(handler) = (cell, ctx: none, ..args) => context pad(
  left: prompt-gutter(),
  handler(cell, ctx: ctx, ..args),
)

#let code-cell = if settings.theme == "notebook" and settings.promptGutter == "code" {
  with-prompt-gutter(code-cell-handler)
} else {
  code-cell-handler
}

// Typst only breaks lines at spaces and hyphens. This means that:
// - a long run of characters such as the dashes above a traceback, or
// - a long URL printed by a cell (where the output is not Markdown), etc.
// runs past the right margin. See
// https://github.com/agriyakhetarpal/jupyterlite-pdf-exporter/issues/80.
//
// What we do here is to put each character in its own box, in order to let
// the line break anywhere, as the notebook interface does with its pre-wrap
// text.
// See https://github.com/typst/typst/issues/674 which links to a host of
// related issues and discussions. Note that we cannot use ZWSes here because
// they affect search and copying in the PDF.
//
// The line length is estimated from the page, the margins, the prompt gutter,
// and the width of a character in the current font. We err on the short side,
// since boxing a run that would have just fit does not cost anything.
#let chars-per-line() = {
  let default-margin = 2.5 / 21 * calc.min(page.width, page.height)
  // A margin can be auto, a length, a ratio of the page width, or both combined
  let margin(side) = {
    let m = page.margin
    if type(m) == dictionary { m = m.at(side, default: auto) }
    if m == auto { default-margin } else if type(m) == ratio { m * page.width } else if type(m) == relative {
      m.length.to-absolute() + m.ratio * page.width
    } else { m.to-absolute() }
  }
  let gutter = if settings.theme == "notebook" { prompt-gutter() } else { 0pt }
  let available = (page.width - margin("left") - margin("right") - gutter - 2em).to-absolute()
  calc.max(calc.floor(available / measure(raw("x")).width), 8)
}

// N.B. Typst fails with "maximum grouping depth exceeded" once a paragraph
// holds more than 512 regex matches, which a long output easily exceeds.
// We walk the text ourselves as a result.
#let break-anywhere(long-run, it) = {
  let source = it.text
  if not source.contains(long-run) { return it }
  let pos = 0
  for m in source.matches(long-run) {
    source.slice(pos, m.start)
    m.text.clusters().map(box).join()
    pos = m.end
  }
  source.slice(pos)
}

// The line length is measured once per block, rather than once per text element
#let wrap-long-runs(body) = context {
  let long-run = regex("\\S{" + str(chars-per-line()) + ",}")
  show text: break-anywhere.with(long-run)
  body
}
// Block raw only: measuring inline raw above would otherwise trigger this rule
#show raw.where(block: true): wrap-long-runs

#if settings.tableOfContents { outline() }

#let body = callisto.render(
  nb: path("notebook.ipynb"),
  theme: settings.theme,
  // auto keeps Callisto's support for "#| echo: false" types of cell headers
  input: if settings.hideInputs { false } else { auto },
  output: if settings.hideOutputs { false } else { auto },
  // Once Callisto renders ANSI colours, console text is not a raw element.
  // So the long run rule is applied through the template it accepts.
  console-text: (
    render: if settings.ansiColors { auto } else { "strip" },
    template: it => wrap-long-runs(callisto.ansi.console-block-template(it)),
  ),
  ignore-wrong-format: true,
  // Markdown can carry Typst code in HTML comments; do not run it
  cmarker: (raw-typst: false),
  handlers: (
    "image-markdown": image-markdown,
    "cell": cell-handler,
    "code-cell": code-cell,
  ),
)

#if settings.theme == "notebook" and settings.promptGutter == "all" {
  context pad(left: prompt-gutter(), body)
} else {
  body
}
