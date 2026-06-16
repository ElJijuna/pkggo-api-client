/**
 * Thrown when a Go package API returns a non-2xx response.
 *
 * @example
 * ```typescript
 * import { PkgGoApiError, PkgGoClient } from 'pkggo-api-client';
 *
 * const pkggo = new PkgGoClient();
 *
 * try {
 *   await pkggo.module('example.com/missing').latest();
 * } catch (error) {
 *   if (error instanceof PkgGoApiError) {
 *     console.log(error.status);
 *     console.log(error.statusText);
 *   }
 * }
 * ```
 */
export class PkgGoApiError extends Error {
  /** HTTP status code returned by the upstream API. */
  readonly status: number;
  /** HTTP status text returned by the upstream API. */
  readonly statusText: string;

  /**
   * @param status - HTTP status code returned by the upstream API.
   * @param statusText - HTTP status text returned by the upstream API.
   */
  constructor(status: number, statusText: string) {
    super(`pkg.go API error: ${status} ${statusText}`);
    this.name = 'PkgGoApiError';
    this.status = status;
    this.statusText = statusText;
  }
}
