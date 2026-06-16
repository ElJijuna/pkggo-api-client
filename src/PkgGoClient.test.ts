import { PkgGoApiError, PkgGoClient } from './index';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJson<T>(data: T, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Error',
    json: () => Promise.resolve(data),
  });
}

function mockText(data: string, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Error',
    text: () => Promise.resolve(data),
  });
}

describe('PkgGoClient', () => {
  let pkggo: PkgGoClient;

  beforeEach(() => {
    mockFetch.mockClear();
    pkggo = new PkgGoClient();
  });

  it('fetches latest module info', async () => {
    mockJson({ Version: 'v1.2.3', Time: '2024-01-02T03:04:05Z' });

    const latest = await pkggo.module('github.com/pkg/errors').latest();

    expect(latest.Version).toBe('v1.2.3');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://proxy.golang.org/github.com/pkg/errors/@latest',
      expect.any(Object),
    );
  });

  it('can await a module resource directly', async () => {
    mockJson({ Version: 'v0.9.0', Time: '2024-01-02T03:04:05Z' });

    const latest = await pkggo.module('golang.org/x/mod');

    expect(latest.Version).toBe('v0.9.0');
  });

  it('throws PkgGoApiError on non-2xx responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: jest.fn(),
    });

    await expect(pkggo.module('example.com/missing').latest()).rejects.toThrow(PkgGoApiError);
  });

  it('lists available versions from the module proxy', async () => {
    mockText('v1.0.0\nv1.1.0\n\nv1.2.0\n');

    const versions = await pkggo.module('github.com/pkg/errors').versions();

    expect(versions).toEqual(['v1.0.0', 'v1.1.0', 'v1.2.0']);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://proxy.golang.org/github.com/pkg/errors/@v/list',
      expect.any(Object),
    );
  });

  it('fetches version info, go.mod text, and zip bytes', async () => {
    mockJson({ Version: 'v1.0.0', Time: '2024-01-02T03:04:05Z' });
    mockText('module github.com/pkg/errors\n');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
    });

    const version = pkggo.module('github.com/pkg/errors').version('v1.0.0');

    await expect(version.info()).resolves.toEqual({
      Version: 'v1.0.0',
      Time: '2024-01-02T03:04:05Z',
    });
    await expect(version.mod()).resolves.toContain('module github.com/pkg/errors');
    await expect(version.zip()).resolves.toBeInstanceOf(ArrayBuffer);
  });

  it('escapes uppercase module paths for Go proxy requests', async () => {
    mockJson({ Version: 'v1.0.0', Time: '2024-01-02T03:04:05Z' });

    await pkggo.module('github.com/Acme/Foo').latest();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://proxy.golang.org/github.com/!acme/!foo/@latest',
      expect.any(Object),
    );
  });

  it('builds pkg.go.dev URLs without fetching', () => {
    expect(pkggo.module('github.com/pkg/errors').pkgGoDevUrl()).toBe(
      'https://pkg.go.dev/github.com/pkg/errors',
    );
    expect(pkggo.module('github.com/pkg/errors').version('v1.0.0').pkgGoDevUrl()).toBe(
      'https://pkg.go.dev/github.com/pkg/errors@v1.0.0',
    );
  });

  it('emits request events on successful requests', async () => {
    const onRequest = jest.fn();
    mockJson({ Version: 'v1.2.3', Time: '2024-01-02T03:04:05Z' });

    pkggo.on('request', onRequest);
    await pkggo.module('github.com/pkg/errors').latest();

    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://proxy.golang.org/github.com/pkg/errors/@latest',
        method: 'GET',
        statusCode: 200,
      }),
    );
    expect(onRequest.mock.calls[0][0].startedAt).toBeInstanceOf(Date);
    expect(onRequest.mock.calls[0][0].finishedAt).toBeInstanceOf(Date);
    expect(typeof onRequest.mock.calls[0][0].durationMs).toBe('number');
  });

  it('emits request events on failed requests', async () => {
    const onRequest = jest.fn();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: jest.fn(),
    });

    pkggo.on('request', onRequest);
    await expect(pkggo.module('example.com/missing').latest()).rejects.toThrow(PkgGoApiError);

    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://proxy.golang.org/example.com/missing/@latest',
        method: 'GET',
        statusCode: 404,
        error: expect.any(PkgGoApiError),
      }),
    );
  });
});
