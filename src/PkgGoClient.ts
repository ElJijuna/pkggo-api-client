import type { GoModuleInfo } from './domain/Module';
import { PkgGoApiError } from './errors/PkgGoApiError';
import { ModuleResource } from './resources/ModuleResource';
import type { ResponseType } from './resources/types';

const DEFAULT_PROXY_URL = 'https://proxy.golang.org';
const DEFAULT_PKG_GO_DEV_URL = 'https://pkg.go.dev';

export interface RequestEvent {
  /** Full URL requested by the client. */
  url: string;
  /** HTTP method used for the request. */
  method: 'GET';
  /** Timestamp captured immediately before the request starts. */
  startedAt: Date;
  /** Timestamp captured after success or failure. */
  finishedAt: Date;
  /** Total request duration in milliseconds. */
  durationMs: number;
  /** HTTP status code when a response was received. */
  statusCode?: number;
  /** Error thrown by the request, when one occurred. */
  error?: Error;
}

/** Event map supported by {@link PkgGoClient}. */
export interface PkgGoClientEvents {
  /** Fired after every request, whether it succeeds or fails. */
  request: (event: RequestEvent) => void;
}

/** Constructor options for {@link PkgGoClient}. */
export interface PkgGoClientOptions {
  /**
   * Base URL for the Go module proxy.
   *
   * Defaults to `https://proxy.golang.org`.
   */
  proxyUrl?: string;
  /**
   * Base URL used when building documentation links.
   *
   * Defaults to `https://pkg.go.dev`.
   */
  pkgGoDevUrl?: string;
}

/**
 * Client for Go module proxy metadata and pkg.go.dev documentation URLs.
 *
 * @example
 * ```typescript
 * import { PkgGoClient } from 'pkggo-api-client';
 *
 * const pkggo = new PkgGoClient();
 *
 * const latest = await pkggo.module('golang.org/x/mod').latest();
 * const versions = await pkggo.module('golang.org/x/mod').versions();
 * const docs = pkggo.module('golang.org/x/mod').pkgGoDevUrl();
 * ```
 */
export class PkgGoClient {
  private readonly proxyUrl: string;
  private readonly pkgGoDevBaseUrl: string;
  private readonly listeners: Map<
    keyof PkgGoClientEvents,
    PkgGoClientEvents[keyof PkgGoClientEvents][]
  > = new Map();

  /**
   * @param options - Optional base URLs for module proxy and documentation links.
   */
  constructor(options: PkgGoClientOptions = {}) {
    this.proxyUrl = (options.proxyUrl ?? DEFAULT_PROXY_URL).replace(/\/$/, '');
    this.pkgGoDevBaseUrl = (options.pkgGoDevUrl ?? DEFAULT_PKG_GO_DEV_URL).replace(/\/$/, '');
  }

  /**
   * Subscribes to a client event.
   *
   * @param event - Event name to listen for.
   * @param callback - Callback invoked with the event payload.
   * @returns This client for chaining.
   */
  on<K extends keyof PkgGoClientEvents>(event: K, callback: PkgGoClientEvents[K]): this {
    const callbacks = this.listeners.get(event) ?? [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
    return this;
  }

  /**
   * Creates a chainable resource for a Go module path.
   *
   * The returned resource can be awaited directly, which resolves to the latest
   * module info.
   *
   * @param modulePath - Module path, for example `golang.org/x/mod`.
   * @returns Chainable module resource.
   */
  module(modulePath: string): ModuleResource {
    const escapedPath = escapeGoPath(modulePath);
    return new ModuleResource(
      <T>(path: string, responseType: ResponseType = 'json', signal?: AbortSignal) =>
        this.request<T>(`/${escapedPath}${path}`, responseType, signal),
      (path, version) => this.buildPkgGoDevUrl(path, version),
      modulePath,
    );
  }

  /**
   * Fetches latest module info for a module path.
   *
   * Convenience wrapper for `pkggo.module(modulePath).latest()`.
   *
   * @param modulePath - Module path, for example `golang.org/x/mod`.
   * @param signal - Optional abort signal.
   * @returns Latest module metadata.
   */
  async latest(modulePath: string, signal?: AbortSignal): Promise<GoModuleInfo> {
    return this.module(modulePath).latest(signal);
  }

  /**
   * Lists versions available from the configured Go module proxy.
   *
   * Convenience wrapper for `pkggo.module(modulePath).versions()`.
   *
   * @param modulePath - Module path, for example `golang.org/x/mod`.
   * @param signal - Optional abort signal.
   * @returns Version strings returned by the proxy.
   */
  async versions(modulePath: string, signal?: AbortSignal): Promise<string[]> {
    return this.module(modulePath).versions(signal);
  }

  /**
   * Builds a pkg.go.dev URL without making a network request.
   *
   * @param modulePath - Module path, for example `golang.org/x/mod`.
   * @param version - Optional version, for example `v0.37.0`.
   * @returns Documentation URL.
   */
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
