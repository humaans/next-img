const path = require('path')
const deepmerge = require('deepmerge')

const overwriteMerge = (destinationArray, sourceArray) => sourceArray
const merge = objs => deepmerge.all(objs, { arrayMerge: overwriteMerge, clone: false })

const imageTest = /\.(jpe?g|png|webp)$/i
const generatedAssetQuery = /__next_img_generated__/
const excludedTurbopackQuery =
  /__next_img_generated__|__next_metadata__|__next_metadata_route__|__next_metadata_image_meta__/
const imageGlobs = ['*.jpg', '*.jpeg', '*.png', '*.webp']

const defaults = {
  breakpoints: [768],
  densities: ['1x', '2x'],

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

  imagesDir: 'images',
  imagesName: '[name]-[size]@[density]-[hash].[ext]',
  imagesPublicPath: null,
  imagesOutputPath: null,

  persistentCache: true,
  persistentCacheDir: 'resources',

  cacheDir: path.join('cache', 'next-img'),
}

/**
 * Configure webpack and Turbopack to handle and optimize images with this plugin.
 *
 * @param {object} pluginConfig - configuration, see the readme for possible values
 * @returns {object}
 */
module.exports = function withImg(extraNextConfig = {}) {
  const {
    nextImg: extraNextImgConfig = {},
    webpack: extraWebpack,
    turbopack: extraTurbopack = {},
    ...nextConfig
  } = extraNextConfig
  const nextImgConfig = merge([{}, defaults, extraNextImgConfig])
  const projectDir = path.resolve(extraNextImgConfig.projectDir || process.env.NEXT_IMG_PROJECT_DIR || process.cwd())
  const turbopackLoaderOptions = getLoaderOptions(nextImgConfig, {
    dir: projectDir,
    distDir: nextConfig.distDir || '.next',
    dev: process.env.NODE_ENV !== 'production',
  })

  assertPersistentCache(turbopackLoaderOptions)

  return {
    ...nextConfig,
    turbopack: addTurbopackRules(extraTurbopack, turbopackLoaderOptions),
    webpack(webpackConfig, webpackContext) {
      const loaderOptions = getLoaderOptions(nextImgConfig, {
        dir: webpackContext.dir,
        distDir: webpackContext.config.distDir,
        dev: webpackContext.dev,
      })
      assertPersistentCache(loaderOptions)

      const assetGenerator = getWebpackAssetGenerator(nextImgConfig, webpackContext)
      let foundNextImageRule = false
      webpackConfig.module.rules = webpackConfig.module.rules.flatMap(rule => {
        if (rule.loader !== 'next-image-loader') return rule
        foundNextImageRule = true
        return createWebpackRules(rule, loaderOptions, assetGenerator)
      })

      if (!foundNextImageRule) {
        webpackConfig.module.rules.push(
          ...createWebpackRules(
            {
              test: imageTest,
              issuer: { not: [/\.(css|scss|sass)$/i] },
              dependency: { not: ['url'] },
              resourceQuery: {
                not: [/__next_metadata__/, /__next_metadata_route__/, /__next_metadata_image_meta__/],
              },
            },
            loaderOptions,
            assetGenerator,
          ),
        )
      }

      webpackConfig.cache = !shouldRebuildPersistentCache() ? webpackConfig.cache : false

      if (typeof extraWebpack === 'function') {
        return extraWebpack(webpackConfig, webpackContext)
      }

      return webpackConfig
    },
  }
}

function createWebpackRules(nextImageRule, loaderOptions, assetGenerator) {
  const { loader: _loader, options: _options, resourceQuery, ...constraints } = nextImageRule

  return [
    {
      ...constraints,
      test: imageTest,
      resourceQuery: generatedAssetQuery,
      type: 'asset/resource',
      generator: assetGenerator,
    },
    {
      ...nextImageRule,
      test: imageTest,
      resourceQuery: withExcludedQuery(resourceQuery, generatedAssetQuery),
      loader: path.join(__dirname, 'loader'),
      options: loaderOptions,
    },
  ]
}

function addTurbopackRules(turbopack, loaderOptions) {
  const rules = { ...turbopack.rules }
  const nextImgRules = [
    {
      condition: { query: generatedAssetQuery },
      type: 'asset',
    },
    {
      condition: { not: { query: excludedTurbopackQuery } },
      loaders: [
        {
          loader: path.join(__dirname, 'loader'),
          options: loaderOptions,
        },
      ],
      as: '*.js',
    },
  ]

  for (const glob of imageGlobs) {
    const existing = rules[glob]
    rules[glob] = existing ? [...nextImgRules, ...(Array.isArray(existing) ? existing : [existing])] : nextImgRules
  }

  return {
    ...turbopack,
    rules,
  }
}

function getLoaderOptions(pluginConfig, { dir, distDir, dev }) {
  const { breakpoints, densities, jpeg, png, webp, imagesName, cacheDir, persistentCache, persistentCacheDir } =
    pluginConfig
  const rebuildSession = process.env.NEXT_IMG_REBUILD || null

  return {
    breakpoints,
    densities,
    jpeg,
    png,
    ...(webp && { webp }),

    dir,
    distDir,
    imagesName,
    cacheDir,
    persistentCacheDir,
    persistentCache,
    assetStageDir: path.join(dir, 'node_modules', '.cache', 'next-img', 'assets'),

    failOnCacheMiss: !dev && !!persistentCache,
    rebuildSession,
  }
}

function getWebpackAssetGenerator(pluginConfig, nextConfig) {
  const { imagesDir, imagesOutputPath, imagesPublicPath } = pluginConfig
  const { isServer } = nextConfig
  const { assetPrefix } = nextConfig.config

  let publicPath = `/_next/static/${imagesDir}/`
  if (imagesPublicPath) {
    publicPath = imagesPublicPath
  } else if (assetPrefix) {
    publicPath = `${assetPrefix}${assetPrefix.endsWith('/') ? '' : '/'}_next/static/${imagesDir}/`
  }

  const outputPath = imagesOutputPath || `${isServer ? '../' : ''}static/${imagesDir}/`

  return {
    filename: '[name][ext]',
    outputPath: toAssetDirectory(outputPath),
    publicPath: toAssetDirectory(publicPath),
  }
}

function toAssetDirectory(value) {
  if (typeof value !== 'function') return ensureTrailingSlash(value)

  return pathData => {
    const fileName = path.basename(pathData.filename.split('?')[0])
    const result = value(fileName)
    return ensureTrailingSlash(result.endsWith(fileName) ? result.slice(0, -fileName.length) : result)
  }
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}

function withExcludedQuery(resourceQuery, query) {
  if (!resourceQuery) return { not: [query] }
  if (resourceQuery && typeof resourceQuery === 'object' && !Array.isArray(resourceQuery)) {
    return {
      ...resourceQuery,
      not: [...(resourceQuery.not || []), query],
    }
  }
  return { and: [resourceQuery, { not: [query] }] }
}

function assertPersistentCache(loaderOptions) {
  if (loaderOptions.rebuildSession && !loaderOptions.persistentCacheDir) {
    throw new Error('Persistent cache for next-img is disabled via next.config.js')
  }
}

function shouldRebuildPersistentCache() {
  return !!process.env.NEXT_IMG_REBUILD
}
