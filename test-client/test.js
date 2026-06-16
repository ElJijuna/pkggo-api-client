import { PkgGoClient } from '../dist/index.js';

const pkggo = new PkgGoClient();
const modulePath = 'golang.org/x/mod';

async function test() {
  pkggo.on('request', (event) => {
    console.log(`${event.method} ${event.statusCode} ${event.url} ${event.durationMs}ms`);
  });

  const module = pkggo.module(modulePath);

  const latest = await module.latest();
  console.log('Latest:', latest.Version, latest.Time);

  const awaitedLatest = await module;
  console.log('Await module:', awaitedLatest.Version);

  const versions = await module.versions();
  console.log('Versions count:', versions.length);
  console.log('First version:', versions[0]);
  console.log('Last listed version:', versions.at(-1));

  const latestVersion = module.version(latest.Version);
  const info = await latestVersion.info();
  console.log('Version info:', info.Version, info.Time);

  const mod = await latestVersion.mod();
  console.log('go.mod first line:', mod.split('\n')[0]);

  const zip = await latestVersion.zip();
  console.log('Zip bytes:', zip.byteLength);

  console.log('pkg.go.dev module URL:', module.pkgGoDevUrl());
  console.log('pkg.go.dev version URL:', latestVersion.pkgGoDevUrl());

  const convenienceLatest = await pkggo.latest(modulePath);
  console.log('Convenience latest:', convenienceLatest.Version);

  const convenienceVersions = await pkggo.versions(modulePath);
  console.log('Convenience versions count:', convenienceVersions.length);
}

try {
  await test();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
