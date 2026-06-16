# pkggo-api-client

<p align="center">
  <img src="https://go.dev/blog/go-brand/Go-Logo/PNG/Go-Logo_Blue.png" alt="Go logo" width="160" />
</p>

[![CI](https://github.com/ElJijuna/pkggo-api-client/actions/workflows/ci.yml/badge.svg)](https://github.com/ElJijuna/pkggo-api-client/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/pkggo-api-client)](https://www.npmjs.com/package/pkggo-api-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/node/v/pkggo-api-client)](https://nodejs.org/)

TypeScript client for Go module metadata. Uses the official Go module proxy protocol and adds helpers for pkg.go.dev URLs. Works in Node.js and browsers. Fully typed, zero runtime dependencies.

## Data sources

| Source | What it provides |
| --- | --- |
| [proxy.golang.org](https://proxy.golang.org) | Latest module version, version list, `.info`, `.mod`, `.zip` |
| [pkg.go.dev](https://pkg.go.dev) | Documentation URLs for modules and versions |

## Installation

```bash
npm install pkggo-api-client
```

## Quick Start

```typescript
import { PkgGoClient } from 'pkggo-api-client';

const pkggo = new PkgGoClient();

const latest = await pkggo.module('github.com/pkg/errors').latest();
console.log(latest.Version);

const versions = await pkggo.module('golang.org/x/mod').versions();
console.log(versions);

const mod = await pkggo.module('github.com/pkg/errors').version('v0.9.1').mod();
console.log(mod);

const docsUrl = pkggo.module('github.com/pkg/errors').version('v0.9.1').pkgGoDevUrl();
console.log(docsUrl);
```

## API

### Client

```typescript
const pkggo = new PkgGoClient({
  proxyUrl: 'https://proxy.golang.org',
  pkgGoDevUrl: 'https://pkg.go.dev',
});
```

### Module Metadata

```typescript
const module = pkggo.module('github.com/pkg/errors');

const latest = await module.latest();
const latest = await module; // same

const versions = await module.versions();
const info = await module.version('v0.9.1').info();
const mod = await module.version('v0.9.1').mod();
const zip = await module.version('v0.9.1').zip();
```

### Convenience Methods

```typescript
const latest = await pkggo.latest('github.com/pkg/errors');
const versions = await pkggo.versions('github.com/pkg/errors');
const url = pkggo.pkgGoDevUrl('github.com/pkg/errors', 'v0.9.1');
```

### Events

```typescript
pkggo.on('request', (event) => {
  console.log(`${event.method} ${event.url} ${event.statusCode} ${event.durationMs}ms`);
});
```

### Error Handling

```typescript
import { PkgGoApiError, PkgGoClient } from 'pkggo-api-client';

const pkggo = new PkgGoClient();

try {
  await pkggo.module('example.com/missing').latest();
} catch (err) {
  if (err instanceof PkgGoApiError) {
    console.log(err.status);
    console.log(err.statusText);
  }
}
```

## Development

```bash
npm install
npm test
npm run build
npm run check
npm run test:client
```
