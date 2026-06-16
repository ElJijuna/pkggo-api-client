import type { GoModuleInfo } from '../domain/Module';
import type { RequestFn, UrlFn } from './types';

export class VersionResource implements PromiseLike<GoModuleInfo> {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly makePkgGoDevUrl: UrlFn,
    private readonly modulePath: string,
    private readonly version: string,
  ) {}

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

  async info(signal?: AbortSignal): Promise<GoModuleInfo> {
    return this.request<GoModuleInfo>(`/@v/${escapeGoPath(this.version)}.info`, 'json', signal);
  }

  async mod(signal?: AbortSignal): Promise<string> {
    return this.request<string>(`/@v/${escapeGoPath(this.version)}.mod`, 'text', signal);
  }

  async zip(signal?: AbortSignal): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>(
      `/@v/${escapeGoPath(this.version)}.zip`,
      'arrayBuffer',
      signal,
    );
  }

  pkgGoDevUrl(): string {
    return this.makePkgGoDevUrl(this.modulePath, this.version);
  }
}

function escapeGoPath(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `!${letter.toLowerCase()}`);
}
