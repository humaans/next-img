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
  imagesDir: 'images',
  imagesName: '[name]-[size]@[density]-[hash].[ext]',
  cacheDir: path.join('cache', 'next-img'),
  imagesPublicPath: null,
  imagesOutputPath: null,

  persistentCache: true,
  persistentCacheDir: 'resources',

  // output image quality configuration
  jpeg: {
    quality: 80,
    webp: {
      quality: 80,
      reductionEffort: 6,
    },
  },

  png: {
    quality: 100,
    webp: {
      quality: 80,
      reductionEffort: 6,
      lossless: true,
    },
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

      if (loaderOptions.rebuildPersistentCache && !loaderOptions.persistentCacheDir) {
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
    imagesDir,
    imagesName,
    breakpoints,
    cacheDir: configCacheDir,
    persistentCache,
    persistentCacheDir: configPersistentCacheDir,
  } = pluginConfig

  const { isServer, dev } = nextConfig
  const { assetPrefix } = nextConfig.config

  let publicPath = `/_next/static/${imagesDir}/`

  if (imagesPublicPath) {
    publicPath = imagesPublicPath
  } else if (assetPrefix) {
    publicPath = `${assetPrefix}${assetPrefix.endsWith('/') ? '' : '/'}_next/static/${imagesDir}/`
  }
  const outputPath = imagesOutputPath || `${isServer ? '../' : ''}static/${imagesDir}/`

  const dir = nextConfig.dir
  const distDir = path.join(dir, nextConfig.config.distDir)
  const cacheDir = path.join(distDir, configCacheDir)
  const persistentCacheDir = persistentCache && path.join(dir, configPersistentCacheDir)
  const failOnCacheMiss = persistentCache && shouldFailOnCacheMiss(pluginConfig, nextConfig, nextComposePlugins)
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
    dev,
    name: imagesName,
    publicPath,
    outputPath,
    breakpoints,
    distDir,
    cacheDir,
    persistentCacheDir,
    persistentCache,
    failOnCacheMiss,
    rebuildPersistentCache,
  }
}

function shouldFailOnCacheMiss(pluginConfig, nextConfig = {}, nextComposePlugins = {}) {
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
