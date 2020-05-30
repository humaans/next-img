const path = require('path')

const withDefaults = pluginConfig => ({
  persistentCache: 'resources',

  optimizeImages: true,

  // TODO - check if dev/prod cache is reused
  // the idea being that if you optimize in dev,
  // even though you need to wait a bit on each page
  // the production builds will go faster when reusing
  // cache (it probably isn't though...)
  optimizeImagesInDev: false,

  handleImages: ['jpeg', 'png'],
  imagesFolder: 'images',
  imagesName: '[name]-[size]@[density]-[hash].[ext]',
  inlineImageLimit: 8192,

  breakpoints: [768],
  densities: ['1x', '2x'],

  // compression settings per output format
  jpeg: {
    quality: 80,
  },
  png: {
    quality: 100,
    optimizationLevel: 4,
  },
  webp: {
    quality: 80,
    reductionEffort: 4,
  },

  ...pluginConfig,
})

/**
 * Configure webpack and next.js to handle and optimize images with this plugin.
 *
 * @param {object} pluginConfig - configuration, see the readme for possible values
 * @param {object} nextComposePlugins - additional information when loaded with next-compose-plugins
 * @returns {object}
 */
module.exports = function withImg(pluginConfig = {}, nextComposePlugins = {}) {
  pluginConfig = withDefaults(pluginConfig)

  return Object.assign({}, pluginConfig, {
    webpack(config, options) {
      if (!options.defaultLoaders) {
        throw new Error(
          'This plugin is not compatible with Next.js versions below 5.0.0 https://err.sh/next-plugins/upgrade',
        )
      }

      // check if it should optimize images in the current step
      const optimizeInCurrentStep = shouldOptimize(pluginConfig, nextComposePlugins, options)

      // remove (unoptimized) builtin image processing introduced in next.js 9.2
      if (config.module.rules) {
        config.module.rules.forEach(rule => {
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
                  subRule.exclude.push(/\.(jpg|jpeg|png|webp|gif)$/)
                }
              }
            })
          }
        })
      }

      config.module.rules.push({
        test: /\.(jpe?g|png|gif|webp)$/i,
        oneOf: [
          {
            use: {
              loader: path.join(__dirname, '..', 'webpack-loader'),
              options: {
                ...getLoaderOptions(pluginConfig, options),
              },
            },
          },
        ],
      })

      if (typeof pluginConfig.webpack === 'function') {
        return pluginConfig.webpack(config, options)
      }

      return config
    },
  })
}

function getLoaderOptions(
  {
    persistentCache,
    assetPrefix,
    imagesPublicPath,
    imagesOutputPath,
    imagesFolder,
    imagesName,
    breakpoints,
    densities,
    jpeg,
    png,
    webp,
  },
  nextConfig,
) {
  let publicPath = `/_next/static/${imagesFolder}/`

  if (imagesPublicPath) {
    publicPath = imagesPublicPath
  } else if (assetPrefix) {
    publicPath = `${assetPrefix}${assetPrefix.endsWith('/') ? '' : '/'}_next/static/${imagesFolder}/`
  }

  const { isServer } = nextConfig
  console.log(nextConfig)
  const cacheDirectory = path.join(nextConfig.config.distDir, 'cache', 'next-img')
  const persistentCacheDirectory = persistentCache && path.join(nextConfig.dir, persistentCache)

  return {
    name: imagesName,
    publicPath,
    outputPath: imagesOutputPath || `${isServer ? '../' : ''}static/${imagesFolder}/`,
    breakpoints,
    densities,
    jpeg,
    png,
    webp,
    cacheDirectory,
    persistentCacheDirectory,
  }
}

function shouldOptimize(pluginConfig, nextComposePlugins = {}, webpackOptions = {}) {
  const { optimizeImages, optimizeImagesInDev } = pluginConfig
  const { dev } = webpackOptions
  const { phase } = nextComposePlugins

  if (typeof phase === 'string') {
    return (
      (phase === 'phase-production-build' && optimizeImages) ||
      (phase === 'phase-export' && optimizeImages) ||
      (phase === 'phase-development-server' && optimizeImagesInDev)
    )
  } else {
    return (!dev && optimizeImages) || (dev && optimizeImagesInDev)
  }
}
