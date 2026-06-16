/**
 * Metadata returned by the Go module proxy `.info` and `@latest` endpoints.
 *
 * @see https://go.dev/ref/mod#goproxy-protocol
 */
export interface GoModuleInfo {
  /** Resolved semantic module version, for example `v1.2.3`. */
  Version: string;
  /** RFC 3339 timestamp for the module version. */
  Time: string;
  /** Optional source control metadata returned by some module proxies. */
  Origin?: {
    /** Version control system name, for example `git`. */
    VCS?: string;
    /** Source repository URL. */
    URL?: string;
    /** Commit hash or revision identifier. */
    Hash?: string;
    /** Source ref used by the proxy. */
    Ref?: string;
  };
}
