/**
 * Thrown when a Go package API returns a non-2xx response.
 */
export class PkgGoApiError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(`pkg.go API error: ${status} ${statusText}`);
    this.name = 'PkgGoApiError';
    this.status = status;
    this.statusText = statusText;
  }
}
