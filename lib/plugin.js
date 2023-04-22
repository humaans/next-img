const path = require('path')
const deepmerge = require('deepmerge')

const overwriteMerge = (destinationArray, sourceArray) => sourceArray
const merge = objs => deepmerge.all(objs, { arrayMerge: overwriteMerge, clone: false })

const defaults = {
  // main configuration options - project dependent
  breakpoints: [768],
  densities: ['1x', '2x'],

  // output image quality configuration
  jpeg: {
    quality: 80,
    webp: {
      quality: 90,
      reductionEffort: 6,
    },
  },

  png: {
    quality: 100,
    webp: {
      reductionEffort: 6,
      lossless: true,
    },
  },

  // advanced configuration options, there shouldn't be a need to change these

  // image serving path and filename settings
  imagesDir: 'images',
  imagesName: '[name]-[size]@[density]-[hash].[ext]',
  imagesPublicPath: null,
  imagesOutputPath: null,

  // persistent cache is stored and checked into the repo
  persistentCache: true,
  persistentCacheDir: 'resources',

  // when not using persistent cache
  cacheDir: path.join('cache', 'next-img'),
}

/**
 * Configure webpack and next.js to handle and optimize images with this plugin.
 *
 * @param {object} pluginConfig - configuration, see the readme for possible values
 * @returns {object}
 */
module.exports = function withImg(extraNextConfig = {}, b) {
  // extract nextImg config from the next config
  const extraNextImgConfig = extraNextConfig.nextImg || {}
  const nextImgConfig = merge([{}, defaults, extraNextImgConfig])
  delete extraNextConfig.nextImg

  //
  return {
    ...extraNextConfig,
    webpack(webpackConfig, nextConfig) {
      const loaderOptions = getLoaderOptions(nextImgConfig, nextConfig)

      if (loaderOptions.rebuildPersistentCache && !loaderOptions.persistentCacheDir) {
        throw new Error('Persistent cache for next-img is disabled via next.config.js')
      }

      webpackConfig.module.rules = webpackConfig.module.rules.map(r =>
        r.loader === 'next-image-loader'
          ? {
              test: /\.(jpe?g|png|webp)$/i,
              loader: path.join(__dirname, 'loader'),
              options: loaderOptions,
            }
          : r,
      )

      // Skip cache when rebuilding persistent cache - otherwise we might miss some images
      webpackConfig.cache = !shouldRebuildPersistentCache() ? webpackConfig.cache : false

      if (typeof extraNextConfig.webpack === 'function') {
        return extraNextConfig.webpack(webpackConfig, nextConfig)
      }

      return webpackConfig
    },
  }
}

function getLoaderOptions(pluginConfig, nextConfig) {
  const {
    breakpoints,
    densities,
    jpeg,
    png,
    webp,
    imagesName,
    imagesDir,
    imagesOutputPath,
    imagesPublicPath,
    cacheDir,
    persistentCache,
    persistentCacheDir,
  } = pluginConfig

  const { isServer, dir } = nextConfig
  const { distDir, assetPrefix } = nextConfig.config

  let publicPath = `/_next/static/${imagesDir}/`
  if (imagesPublicPath) {
    publicPath = imagesPublicPath
  } else if (assetPrefix) {
    publicPath = `${assetPrefix}${assetPrefix.endsWith('/') ? '' : '/'}_next/static/${imagesDir}/`
  }

  const outputPath = imagesOutputPath || `${isServer ? '../' : ''}static/${imagesDir}/`

  const failOnCacheMiss = persistentCache && shouldFailOnCacheMiss(pluginConfig, nextConfig)
  const rebuildPersistentCache = shouldRebuildPersistentCache()

  return {
    // these come from the next-img plugin config, but it is possible to
    // override them in the individual requires
    breakpoints,
    densities,
    jpeg,
    png,
    webp,

    // these we will not allow overriding as that'd just be confusing
    // these ought to be only configurable via next-img plugin config
    dir,
    distDir,
    imagesName,
    publicPath,
    outputPath,
    cacheDir,
    persistentCacheDir,
    persistentCache,

    // some loader options for when a stricted failure mode
    // is useful, e.g. when building with next or next-img
    failOnCacheMiss,
    rebuildPersistentCache,
  }
}

function shouldFailOnCacheMiss(pluginConfig, nextConfig = {}) {
  return !nextConfig.dev && !!pluginConfig.persistentCache
}

function shouldRebuildPersistentCache() {
  return !!process.env.NEXT_IMG_REBUILD
}
