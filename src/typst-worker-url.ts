// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

/**
 * Start the Typst compiler worker. The bundler (should?) pick up
 * the `new URL` form and emits the worker as its own chunk.
 */
export function createTypstWorker(): Worker {
  return new Worker(new URL('./typst-worker.js', import.meta.url));
}
