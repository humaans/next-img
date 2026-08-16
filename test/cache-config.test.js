const { default: test } = require('ava')
const { resolveCacheConfig } = require('../lib/cache-config')

test('resolves canonical cache configuration and defaults', t => {
  t.deepEqual(resolveCacheConfig({}), { mode: 'read-write', dir: 'resources' })
  t.deepEqual(resolveCacheConfig({ cache: null }), { mode: 'read-write', dir: 'resources' })
  t.deepEqual(resolveCacheConfig({ cache: { mode: 'read-only', rebuildSession: 'session' } }), {
    mode: 'read-only',
    dir: 'resources',
    rebuildSession: 'session',
  })
})

test('normalizes legacy loader cache options at the compatibility boundary', t => {
  t.deepEqual(
    resolveCacheConfig({
      persistentCache: true,
      persistentCacheDir: 'legacy-resources',
      failOnCacheMiss: true,
      rebuildSession: null,
    }),
    {
      mode: 'read-only',
      dir: 'legacy-resources',
      rebuildSession: null,
    },
  )
  t.deepEqual(resolveCacheConfig({ persistentCache: false }), {
    mode: 'off',
    dir: 'resources',
    rebuildSession: null,
  })
})

test('validates cache configuration at its boundary', t => {
  t.throws(() => resolveCacheConfig({ cache: { mode: 'unknown' } }), { message: /Unknown next-img cache mode/ })
  t.throws(() => resolveCacheConfig({ cache: { dir: '' } }), { message: /cache.dir must be a non-empty string/ })
})
