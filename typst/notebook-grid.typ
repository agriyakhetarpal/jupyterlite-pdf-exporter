// The notebook-grid theme as proposed by Callisto's author in
// https://github.com/sijow/callisto/issues/22, copied without changes. It
// keeps the In/Out prompts inside the text area, in the first column of a
// grid, rather than in the page margin where the built-in notebook theme puts
// them. It stays here until Callisto ships it as a built-in theme.
#import "@preview/callisto:0.3.0" 
#import callisto: themes, handle, outputs

// Make whole prompt
#let _prompt(prefix, count) = {
  let count-str = if count == none { " " } else { str(count) }
  raw(prefix + "[" + count-str + "]:")
}

// Handler for code cell input
#let code-cell-input(cell, ctx: none, block-args: none, ..args) = {
  let body = grid(
    columns: 2,
    column-gutter: 0.5em,
    inset: 0.5em,
    // First column: prompt
    _prompt("In ", cell.execution_count),
    // Second column: source
    block(
      width: 100%,
      outset: 0.5em,
      fill: luma(240),
      handle(cell.source, mime: "source-code-generic", ctx: ctx, lang: ctx.lang),
    ),
  )

  // Wrapper block with proper spacing to possible output, and optional styling
  block(
    above: 2em,
    below: if ctx.output and cell.outputs.len() > 0 { 0pt } else { 2em },
    width: 100%,
    ..block-args,
    body,
  )
}

// Handler for whole cell output
#let code-cell-output(cell, ctx: none, ..args) = {
  let outs = outputs(cell, ..ctx.cfg, result: "dict")
  if outs.len() == 0 { return }

  let prompt = _prompt("Out", cell.execution_count)

  let rows = outs.map(out => {
    (
      // First column: prompt but hidden except for result items
      if out.type == "result" { prompt } else { hide(prompt) },
      // Second column: rendered output
      out.value,
    )
  })

  let body = grid(
    columns: 2,
    column-gutter: 0.5em,
    inset: 0.5em,
    ..rows.join(),
  )

  // Wrapper block with proper spacing to possible input
  block(
    above: if ctx.input { 0pt } else { 2em },
    below: 2em,
    width: 100%,
    body,
  )
}

// Handler for input placeholder derived from cell source
#let placeholder-input-from-source(source, ctx: none, ..args) = {
  let cell = (
    source: source,
    execution_count: "?",
  )
  let block-args = (stroke: (dash: "dashed"))
  ctx.output = false
  return code-cell-input(cell, ctx: ctx, block-args: block-args)
}

// Theme dictionary
#let theme = themes.notebook + (
  result: handle.with(mime: "rich-output-generic"),
  code-cell-input: code-cell-input,
  code-cell-output: code-cell-output,
  placeholder-input-from-source: placeholder-input-from-source,
)
