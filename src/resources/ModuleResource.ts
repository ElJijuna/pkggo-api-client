import type { GoModuleInfo } from '../domain/Module';
import { VersionResource } from './VersionResource';
import type { RequestFn, UrlFn } from './types';

/**
 * Chainable resource for a Go module path.
 *
 * Implements `PromiseLike<GoModuleInfo>`, so awaiting a module resource fetches
 * latest module info.
 *
 * @example
 * ```typescript
 * const pkggo = new PkgGoClient();
 *
 * const latest = await pkggo.module('golang.org/x/mod');
 * const versions = await pkggo.module('golang.org/x/mod').versions();
 * const mod = await pkggo.module('golang.org/x/mod').mod(latest.Version);
 * ```
 */
export class ModuleResource implements PromiseLike<GoModuleInfo> {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly makePkgGoDevUrl: UrlFn,
    private readonly path: string,
  ) {}

  /**
   * Allows the resource to be awaited directly.
   *
   * Resolves with the same value as {@link ModuleResource.latest}.
   */
  async then<TResult1 = GoModuleInfo, TResult2 = never>(
    onfulfilled?: ((value: GoModuleInfo) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    try {
      const value = await this.latest();
      return onfulfilled ? onfulfilled(value) : (value as TResult1);
    } catch (reason) {
      if (onrejected) {
        return onrejected(reason);
      }
      throw reason;
    }
  }

  /**
   * Fetches latest version metadata for this module.
   *
   * `GET /{module}/@latest`
   *
   * @param signal - Optional abort signal.
   * @returns Latest module metadata.
   */
  async latest(signal?: AbortSignal): Promise<GoModuleInfo> {
    return this.request<GoModuleInfo>('/@latest', 'json', signal);
  }

  /**
   * Lists module versions known by the configured Go module proxy.
   *
   * `GET /{module}/@v/list`
   *
   * @param signal - Optional abort signal.
   * @returns Version strings returned by the proxy.
   */
  async versions(signal?: AbortSignal): Promise<string[]> {
    const body = await this.request<string>('/@v/list', 'text', signal);
    return body
      .split('\n')
      .map((version) => version.trim())
      .filter(Boolean);
  }

  /**
   * Creates a chainable resource for a specific module version.
   *
   * @param version - Module version, for example `v0.37.0`.
   * @returns Chainable version resource.
   */
  version(version: string): VersionResource {
    return new VersionResource(this.request, this.makePkgGoDevUrl, this.path, version);
  }

  /**
   * Fetches the `go.mod` file for a version.
   *
   * Convenience wrapper for `module.version(version).mod()`.
   *
   * @param version - Module version, for example `v0.37.0`.
   * @param signal - Optional abort signal.
   * @returns Raw `go.mod` file contents.
   */
  async mod(version: string, signal?: AbortSignal): Promise<string> {
    return this.version(version).mod(signal);
  }

  /**
   * Downloads the module zip archive for a version.
   *
   * Convenience wrapper for `module.version(version).zip()`.
   *
   * @param version - Module version, for example `v0.37.0`.
   * @param signal - Optional abort signal.
   * @returns Zip archive bytes.
   */
  async zip(version: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    return this.version(version).zip(signal);
  }

  /**
   * Builds a pkg.go.dev URL for this module without making a network request.
   *
   * @returns Documentation URL for this module.
   */
  pkgGoDevUrl(): string {
    return this.makePkgGoDevUrl(this.path);
  }
}
