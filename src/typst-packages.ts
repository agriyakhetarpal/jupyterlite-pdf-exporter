// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import basedUrl from '../typst-packages/based-0.2.0.tar.gz';
import callistoUrl from '../typst-packages/callisto-0.3.0.tar.gz';
import cmarkerUrl from '../typst-packages/cmarker-0.1.10.tar.gz';
import mitexUrl from '../typst-packages/mitex-0.2.7.tar.gz';
import percencodeUrl from '../typst-packages/percencode-0.1.0.tar.gz';

/**
 * The version of Callisto we import in the generated Typst wrapper
 * Keep in sync with scripts/vendor_typst_packages.py
 */
export const CALLISTO_VERSION = '0.3.0';

/**
 * Bundled Typst packages we ship
 * Keep in sync with scripts/vendor_typst_packages.py
 */
const BUNDLED_PACKAGES: Record<string, string> = {
  [`callisto/${CALLISTO_VERSION}`]: callistoUrl,
  'cmarker/0.1.10': cmarkerUrl,
  'mitex/0.2.7': mitexUrl,
  'based/0.2.0': basedUrl,
  'percencode/0.1.0': percencodeUrl
};

/**
 * A subset of typst.ts's types that the registry uses
 */
interface IPackageSpec {
  namespace: string;
  name: string;
  version: string;
}

interface IPackageResolveContext {
  untar(
    data: Uint8Array,
    cb: (path: string, data: Uint8Array, mtime: number) => void
  ): void;
}

interface IWritableAccessModel {
  insertFile(path: string, data: Uint8Array, mtime: Date): void;
}

/**
 * A package registry for typst.ts that resolves @preview imports from the
 * archives bundled with the extension, instead of fetching them from
 * packages.typst.org. Since the compiler calls `resolve` synchronously,
 * the archives have to be fetched upfront with `load`.
 */
export class BundledPackageRegistry {
  constructor(accessModel: IWritableAccessModel) {
    this._accessModel = accessModel;
  }

  /**
   * Fetch the bundled packages from the extension and store them in memory. This
   * must be called before the registry is used.
   */
  async load(): Promise<void> {
    await Promise.all(
      Object.entries(BUNDLED_PACKAGES).map(async ([key, url]) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch Typst package ${key}: ${response.status}`
          );
        }
        this._archives.set(key, new Uint8Array(await response.arrayBuffer()));
      })
    );
  }

  /**
   * Resolve a package spec to a directory in the access model, unpacking
   * the archive on first use.
   * @param spec - The package spec to resolve
   * @param context - The context to use for unpacking the archive
   * @returns - The directory in the access model where the package is unpacked, or
   *   undefined if the package is not found
   */
  resolve(
    spec: IPackageSpec,
    context: IPackageResolveContext
  ): string | undefined {
    if (spec.namespace !== 'preview') {
      return undefined;
    }
    const key = `${spec.name}/${spec.version}`;
    const resolved = this._resolved.get(key);
    if (resolved) {
      return resolved;
    }
    const archive = this._archives.get(key);
    if (!archive) {
      return undefined;
    }
    const directory = `/@memory/packages/preview/${spec.name}/${spec.version}`;
    context.untar(archive, (path, data, mtime) => {
      this._accessModel.insertFile(
        `${directory}/${path}`,
        data,
        new Date(mtime)
      );
    });
    this._resolved.set(key, directory);
    return directory;
  }

  private _accessModel: IWritableAccessModel;
  private _archives = new Map<string, Uint8Array>();
  private _resolved = new Map<string, string>();
}
