export type ResponseType = 'json' | 'text' | 'arrayBuffer';

export type RequestFn = <T>(
  path: string,
  responseType?: ResponseType,
  signal?: AbortSignal,
) => Promise<T>;

export type UrlFn = (modulePath: string, version?: string) => string;
