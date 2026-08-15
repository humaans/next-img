const assetStore = require('./asset-store')

module.exports = function generatedAssetLoader() {
  const callback = this.async()
  const config = this.getOptions()
  const query = new URLSearchParams(this.resourceQuery.replace(/^\?/, ''))
  const cacheKey = query.get('key')

  if (!cacheKey) {
    callback(new Error('next-img generated an asset request without a cache key'))
    return
  }

  assetStore.read(cacheKey, config).then(
    data => callback(null, data),
    error => callback(new Error(`next-img could not read generated asset ${cacheKey}: ${error.message}`)),
  )
}

module.exports.raw = true
