import type { GoModuleInfo } from '../domain/Module';
import type { RequestFn, UrlFn } from './types';

/**
 * Chainable resource for a specific Go module version.
 *
 * Implements `PromiseLike<GoModuleInfo>`, so awaiting a version resource fetches
 * version info.
 *
 * @example
 * ```typescript
 * const version = pkggo.module('golang.org/x/mod').version('v0.37.0');
 *
 * const info = await version;
 * const mod = await version.mod();
 * const zip = await version.zip();
 * ```
 */
export class VersionResource implements PromiseLike<GoModuleInfo> {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly makePkgGoDevUrl: UrlFn,
    private readonly modulePath: string,
    private readonly version: string,
  ) {}

  /**
   * Allows the resource to be awaited directly.
   *
   * Resolves with the same value as {@link VersionResource.info}.
   */
  async then<TResult1 = GoModuleInfo, TResult2 = never>(
    onfulfilled?: ((value: GoModuleInfo) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    try {
      const value = await this.info();
      return onfulfilled ? onfulfilled(value) : (value as TResult1);
    } catch (reason) {
      if (onrejected) {
        return onrejected(reason);
      }
      throw reason;
    }
  }

  /**
   * Fetches metadata for this module version.
   *
   * `GET /{module}/@v/{version}.info`
   *
   * @param signal - Optional abort signal.
   * @returns Version metadata.
   */
  async info(signal?: AbortSignal): Promise<GoModuleInfo> {
    return this.request<GoModuleInfo>(`/@v/${escapeGoPath(this.version)}.info`, 'json', signal);
  }

  /**
   * Fetches the `go.mod` file for this module version.
   *
   * `GET /{module}/@v/{version}.mod`
   *
   * @param signal - Optional abort signal.
   * @returns Raw `go.mod` file contents.
   */
  async mod(signal?: AbortSignal): Promise<string> {
    return this.request<string>(`/@v/${escapeGoPath(this.version)}.mod`, 'text', signal);
  }

  /**
   * Downloads the zip archive for this module version.
   *
   * `GET /{module}/@v/{version}.zip`
   *
   * @param signal - Optional abort signal.
   * @returns Zip archive bytes.
   */
  async zip(signal?: AbortSignal): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>(
      `/@v/${escapeGoPath(this.version)}.zip`,
      'arrayBuffer',
      signal,
    );
  }

  /**
   * Builds a pkg.go.dev URL for this module version without making a network request.
   *
   * @returns Documentation URL for this version.
   */
  pkgGoDevUrl(): string {
    return this.makePkgGoDevUrl(this.modulePath, this.version);
  }
}

function escapeGoPath(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `!${letter.toLowerCase()}`);
}
