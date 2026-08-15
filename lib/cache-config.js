function getCacheConfig(config) {
  if (config.cache) return config.cache

  const persistent = config.persistentCache !== false
  return {
    mode: persistent ? (config.failOnCacheMiss ? 'read-only' : 'read-write') : 'off',
    dir: config.persistentCacheDir,
    rebuildSession: config.rebuildSession ?? null,
  }
}

function normalizeCacheConfig(config) {
  return config.cache ? config : { ...config, cache: getCacheConfig(config) }
}

module.exports = { getCacheConfig, normalizeCacheConfig }
