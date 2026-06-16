import type { GoModuleInfo } from '../domain/Module';
import { VersionResource } from './VersionResource';
import type { RequestFn, UrlFn } from './types';

export class ModuleResource implements PromiseLike<GoModuleInfo> {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly makePkgGoDevUrl: UrlFn,
    private readonly path: string,
  ) {}

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

  async latest(signal?: AbortSignal): Promise<GoModuleInfo> {
    return this.request<GoModuleInfo>('/@latest', 'json', signal);
  }

  async versions(signal?: AbortSignal): Promise<string[]> {
    const body = await this.request<string>('/@v/list', 'text', signal);
    return body
      .split('\n')
      .map((version) => version.trim())
      .filter(Boolean);
  }

  version(version: string): VersionResource {
    return new VersionResource(this.request, this.makePkgGoDevUrl, this.path, version);
  }

  async mod(version: string, signal?: AbortSignal): Promise<string> {
    return this.version(version).mod(signal);
  }

  async zip(version: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    return this.version(version).zip(signal);
  }

  pkgGoDevUrl(): string {
    return this.makePkgGoDevUrl(this.path);
  }
}
