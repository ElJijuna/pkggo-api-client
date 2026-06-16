import type { GoModuleInfo } from './domain/Module';
import { PkgGoApiError } from './errors/PkgGoApiError';
import { ModuleResource } from './resources/ModuleResource';
import type { ResponseType } from './resources/types';

const DEFAULT_PROXY_URL = 'https://proxy.golang.org';
const DEFAULT_PKG_GO_DEV_URL = 'https://pkg.go.dev';

export interface RequestEvent {
  url: string;
  method: 'GET';
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  statusCode?: number;
  error?: Error;
}

export interface PkgGoClientEvents {
  request: (event: RequestEvent) => void;
}

export interface PkgGoClientOptions {
  proxyUrl?: string;
  pkgGoDevUrl?: string;
}

export class PkgGoClient {
  private readonly proxyUrl: string;
  private readonly pkgGoDevBaseUrl: string;
  private readonly listeners: Map<
    keyof PkgGoClientEvents,
    PkgGoClientEvents[keyof PkgGoClientEvents][]
  > = new Map();

  constructor(options: PkgGoClientOptions = {}) {
    this.proxyUrl = (options.proxyUrl ?? DEFAULT_PROXY_URL).replace(/\/$/, '');
    this.pkgGoDevBaseUrl = (options.pkgGoDevUrl ?? DEFAULT_PKG_GO_DEV_URL).replace(/\/$/, '');
  }

  on<K extends keyof PkgGoClientEvents>(event: K, callback: PkgGoClientEvents[K]): this {
    const callbacks = this.listeners.get(event) ?? [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
    return this;
  }

  module(modulePath: string): ModuleResource {
    const escapedPath = escapeGoPath(modulePath);
    return new ModuleResource(
      <T>(path: string, responseType: ResponseType = 'json', signal?: AbortSignal) =>
        this.request<T>(`/${escapedPath}${path}`, responseType, signal),
      (path, version) => this.buildPkgGoDevUrl(path, version),
      modulePath,
    );
  }

  async latest(modulePath: string, signal?: AbortSignal): Promise<GoModuleInfo> {
    return this.module(modulePath).latest(signal);
  }

  async versions(modulePath: string, signal?: AbortSignal): Promise<string[]> {
    return this.module(modulePath).versions(signal);
  }

  pkgGoDevUrl(modulePath: string, version?: string): string {
    return this.buildPkgGoDevUrl(modulePath, version);
  }

  private async request<T>(
    path: string,
    responseType: ResponseType,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = `${this.proxyUrl}${path}`;
    const startedAt = new Date();
    let statusCode: number | undefined;

    try {
      const response = await fetch(url, {
        headers: { Accept: responseType === 'json' ? 'application/json' : '*/*' },
        signal,
      });
      statusCode = response.status;

      if (!response.ok) {
        throw new PkgGoApiError(response.status, response.statusText);
      }

      const data = (await readResponse(response, responseType)) as T;
      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        statusCode,
      });
      return data;
    } catch (err) {
      const finishedAt = new Date();
      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        statusCode,
        error: err instanceof Error ? err : new Error(String(err)),
      });
      throw err;
    }
  }

  private emit<K extends keyof PkgGoClientEvents>(
    event: K,
    payload: Parameters<PkgGoClientEvents[K]>[0],
  ): void {
    const callbacks = this.listeners.get(event) ?? [];
    for (const callback of callbacks) {
      (callback as (p: typeof payload) => void)(payload);
    }
  }

  private buildPkgGoDevUrl(modulePath: string, version?: string): string {
    return `${this.pkgGoDevBaseUrl}/${modulePath}${version ? `@${version}` : ''}`;
  }
}

function escapeGoPath(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `!${letter.toLowerCase()}`);
}

async function readResponse(response: Response, responseType: ResponseType): Promise<unknown> {
  if (responseType === 'json') {
    return response.json();
  }

  if (responseType === 'text') {
    return response.text();
  }

  return response.arrayBuffer();
}
