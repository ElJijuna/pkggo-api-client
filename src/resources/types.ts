/** @internal */
export type ResponseType = 'json' | 'text' | 'arrayBuffer';

/** @internal */
export type RequestFn = <T>(
  path: string,
  responseType?: ResponseType,
  signal?: AbortSignal,
) => Promise<T>;

/** @internal */
export type UrlFn = (modulePath: string, version?: string) => string;
