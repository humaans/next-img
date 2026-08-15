const { default: test } = require('ava')
const { getCacheConfig, normalizeCacheConfig } = require('../lib/cache-config')

test('preserves canonical cache configuration', t => {
  const cache = { mode: 'read-only', dir: 'resources', rebuildSession: 'session' }
  const config = { cache }

  t.is(getCacheConfig(config), cache)
  t.is(normalizeCacheConfig(config), config)
})

test('normalizes legacy loader cache options at the compatibility boundary', t => {
  t.deepEqual(
    getCacheConfig({
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
  t.is(getCacheConfig({ persistentCache: false }).mode, 'off')
})
