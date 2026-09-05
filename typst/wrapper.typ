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

#if settings.tableOfContents { outline() }

#let body = callisto.render(
  nb: path("notebook.ipynb"),
  theme: settings.theme,
  // auto keeps Callisto's support for "#| echo: false" types of cell headers
  input: if settings.hideInputs { false } else { auto },
  output: if settings.hideOutputs { false } else { auto },
  console-text: if settings.ansiColors { auto } else { "strip" },
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
