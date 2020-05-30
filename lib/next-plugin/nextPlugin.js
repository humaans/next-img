const path = require('path')
const deepmerge = require('deepmerge')

const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray

const defaults = {
  // main configuration options - project dependent
  breakpoints: [768],
  densities: ['1x', '2x'],

  // TODO - implement
  // inlineImageLimit: 8192,

  // advanced configuration options - there shouldn't be a need to change these
  handleImages: ['jpeg', 'png'],
  imagesFolder: 'images',
  imagesPublicPath: null,
  imagesOutputPath: null,
  imagesName: '[name]-[size]@[density]-[hash].[ext]',
  persistentCache: 'images',

  // output image quality configuration
  jpeg: {
    quality: 80,
  },

  png: {
    quality: 100,
    compressionLevel: 0,
    advpng: {
      optimizationLevel: 4,
    },
  },

  webp: {
    quality: 80,
    reductionEffort: 4,
  },
}

/**
 * Configure webpack and next.js to handle and optimize images with this plugin.
 *
 * @param {object} pluginConfig - configuration, see the readme for possible values
 * @param {object} nextComposePlugins - additional information when loaded with next-compose-plugins
 * @returns {object}
 */
module.exports = function withImg(pluginConfig = {}, nextComposePlugins = {}) {
  pluginConfig = deepmerge.all([{}, defaults, pluginConfig], { arrayMerge: overwriteMerge })

  return {
    ...pluginConfig,
    webpack(webpackConfig, nextConfig) {
      const loaderOptions = getLoaderOptions(pluginConfig, nextConfig, nextComposePlugins)

      if (loaderOptions.rebuildPersistentCache && !loaderOptions.usePersistentCache) {
        throw new Error('Persistent cache for next-img is disabled via next.config.js')
      }

      // remove (unoptimized) builtin image processing introduced in next.js 9.2
      if (webpackConfig.module.rules) {
        webpackConfig.module.rules.forEach(rule => {
          if (rule.oneOf) {
            rule.oneOf.forEach(subRule => {
              if (
                subRule.issuer &&
                !subRule.test &&
                !subRule.include &&
                subRule.exclude &&
                subRule.use &&
                subRule.use.options &&
                subRule.use.options.name
              ) {
                if (
                  String(subRule.issuer.test) === '/\\.(css|scss|sass)$/' &&
                  subRule.use.options.name.startsWith('static/media/')
                ) {
                  subRule.exclude.push(/\.(jpg|jpeg|png|webp)$/)
                }
              }
            })
          }
        })
      }

      webpackConfig.module.rules.push({
        test: /\.(jpe?g|png|webp)$/i,
        oneOf: [
          {
            use: {
              loader: path.join(__dirname, '..', 'webpack-loader'),
              options: loaderOptions,
            },
          },
        ],
      })

      if (typeof pluginConfig.webpack === 'function') {
        return pluginConfig.webpack(webpackConfig, nextConfig)
      }

      return webpackConfig
    },
  }
}

function getLoaderOptions(pluginConfig, nextConfig, nextComposePlugins) {
  const {
    densities,
    jpeg,
    png,
    webp,
    imagesPublicPath,
    imagesOutputPath,
    imagesFolder,
    imagesName,
    breakpoints,
    persistentCache,
  } = pluginConfig

  const { isServer } = nextConfig
  const { assetPrefix } = nextConfig.config

  let publicPath = `/_next/static/${imagesFolder}/`

  if (imagesPublicPath) {
    publicPath = imagesPublicPath
  } else if (assetPrefix) {
    publicPath = `${assetPrefix}${assetPrefix.endsWith('/') ? '' : '/'}_next/static/${imagesFolder}/`
  }

  const outputPath = imagesOutputPath || `${isServer ? '../' : ''}static/${imagesFolder}/`

  const cacheDir = path.join(nextConfig.config.distDir, 'cache', 'next-img')
  const persistentCacheDir = persistentCache && path.join(nextConfig.dir, persistentCache)

  const usePersistentCache = shouldUsePersistentCache(pluginConfig, nextConfig, nextComposePlugins)
  const rebuildPersistentCache = shouldRebuildPersistentCache()

  return {
    // these come from the next-img plugin config, but it is possible to
    // override them in the individual requires
    densities,
    jpeg,
    png,
    webp,

    // these we will not allow overriding as that'd just be confusing
    // these ought to be only configurable via next-img plugin config
    name: imagesName,
    publicPath,
    outputPath,
    breakpoints,
    cacheDir,
    persistentCacheDir,
    usePersistentCache,
    rebuildPersistentCache,
  }
}

function shouldUsePersistentCache(pluginConfig, nextConfig = {}, nextComposePlugins = {}) {
  const { persistentCache } = pluginConfig
  const { dev } = nextConfig
  const { phase } = nextComposePlugins

  if (typeof phase === 'string') {
    return (phase === 'phase-production-build' && !!persistentCache) || (phase === 'phase-export' && !!persistentCache)
  } else {
    return !dev && !!persistentCache
  }
}

function shouldRebuildPersistentCache() {
  return !!process.env.NEXT_IMG_REBUILD
}

function isObject(a) {
  return !!a && a.constructor === Object
}

function has(a, b) {
  return Object.prototype.hasOwnProperty.call(a, b)
}
