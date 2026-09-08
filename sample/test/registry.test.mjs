import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, lstat } from 'node:fs/promises';

test('sample consumes an exact registry release, never the parent package', async () => {
  const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const manifest = await json('../package.json');
  const lock = await json('../package-lock.json');
  assert.deepEqual(lock.packages[''].dependencies, manifest.dependencies);
  for (const [path, dependency] of Object.entries(lock.packages)) {
    assert.ok(path === '' || path.startsWith('node_modules/'), `Local lockfile path: ${path}`);
    assert.notEqual(dependency.link, true, `Linked dependency: ${path}`);
  }
  const name = 'arkiv-encrypted-entities';
  const version = manifest.dependencies[name];
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(lock.packages[''].dependencies[name], version);
  const entry = lock.packages[`node_modules/${name}`];
  assert.equal(entry.version, version);
  assert.equal(entry.resolved, `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`);
  assert.match(entry.integrity, /^sha512-/);
  assert.notEqual(entry.link, true);
  assert.equal((await lstat(new URL(`../node_modules/${name}`, import.meta.url))).isSymbolicLink(), false);
  assert.equal((await json(`../node_modules/${name}/package.json`)).version, version);
});
