const DEFAULT_CACHE = Object.freeze({
  mode: 'read-write',
  dir: 'resources',
})

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

function resolveCacheConfig(config) {
  let cache
  if (hasOwn(config, 'cache')) {
    cache = { ...DEFAULT_CACHE, ...config.cache }
  } else if (
    hasOwn(config, 'persistentCache') ||
    hasOwn(config, 'persistentCacheDir') ||
    hasOwn(config, 'failOnCacheMiss') ||
    hasOwn(config, 'rebuildSession')
  ) {
    cache = {
      mode: config.persistentCache === false ? 'off' : config.failOnCacheMiss ? 'read-only' : DEFAULT_CACHE.mode,
      dir: config.persistentCacheDir || DEFAULT_CACHE.dir,
      rebuildSession: config.rebuildSession ?? null,
    }
  } else {
    cache = { ...DEFAULT_CACHE }
  }

  if (!['read-write', 'read-only', 'off'].includes(cache.mode)) {
    throw new Error(`Unknown next-img cache mode: ${cache.mode}`)
  }
  if (cache.mode !== 'off' && (!cache.dir || typeof cache.dir !== 'string')) {
    throw new Error('next-img cache.dir must be a non-empty string')
  }
  return cache
}

module.exports = { resolveCacheConfig }
