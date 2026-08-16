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
    hasOwn(config, 'failOnCacheMiss')
  ) {
    cache = {
      mode: config.persistentCache === false ? 'off' : config.failOnCacheMiss ? 'read-only' : DEFAULT_CACHE.mode,
      dir: config.persistentCacheDir || DEFAULT_CACHE.dir,
    }
  } else {
    cache = { ...DEFAULT_CACHE }
  }

  if (!['read-write', 'read-only', 'off'].includes(cache.mode)) {
    throw new Error(`Unknown next-img cache mode: ${cache.mode}`)
  }
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- This validates external configuration at its boundary.
  if (cache.mode !== 'off' && (!cache.dir || typeof cache.dir !== 'string')) {
    throw new Error('next-img cache.dir must be a non-empty string')
  }
  return cache
}

module.exports = { resolveCacheConfig }
