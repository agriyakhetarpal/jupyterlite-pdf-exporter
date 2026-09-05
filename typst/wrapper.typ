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

#if settings.tableOfContents { outline() }

#callisto.render(
  nb: path("notebook.ipynb"),
  theme: settings.theme,
  ignore-wrong-format: true,
  // Markdown can carry Typst code in HTML comments; do not run it
  cmarker: (raw-typst: false),
  handlers: ("image-markdown": image-markdown),
)
