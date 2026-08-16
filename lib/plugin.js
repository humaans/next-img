const path = require('path')
const fs = require('fs')
const deepmerge = require('deepmerge')
const { resolveCacheConfig } = require('./cache-config')
const { INPUT_EXTENSIONS, OUTPUT_FORMATS, getFormat } = require('./formats')

const overwriteMerge = (destinationArray, sourceArray) => sourceArray
const merge = objs => deepmerge.all(objs, { arrayMerge: overwriteMerge, clone: false })

const imageTest = new RegExp(`\\.(${INPUT_EXTENSIONS.join('|')})$`, 'i')
const generatedAssetQuery = /__next_img_generated__/
const excludedTurbopackQuery =
  /__next_img_generated__|__next_metadata__|__next_metadata_route__|__next_metadata_image_meta__/
const imageGlobs = INPUT_EXTENSIONS.map(extension => `*.${extension}`)

const defaults = {
  breakpoints: [768],
  densities: ['1x', '2x'],
  formats: ['webp'],
  fallbackFormat: 'original',
  strict: false,
  maxBareImportSize: 2048,

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

  avif: {
    quality: 50,
    effort: 4,
  },

  imagesDir: 'images',
  imagesName: '[name]-[size]@[density]-[xxhash64:hash:hex:16].[ext]',
  imagesPublicPath: null,
  imagesOutputPath: null,

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
  nextImgConfig.cache = resolveCacheConfig(extraNextImgConfig)
  validateMaxBareImportSize(nextImgConfig.maxBareImportSize)
  const projectDir = path.resolve(extraNextImgConfig.projectDir || process.env.NEXT_IMG_PROJECT_DIR || process.cwd())
  const assetProxyDir = ensureTurbopackAssetProxies(projectDir)
  const turbopackLoaderOptions = getLoaderOptions(nextImgConfig, {
    bundler: 'turbopack',
    dir: projectDir,
    distDir: nextConfig.distDir || '.next',
    assetProxyDir,
  })

  assertPersistentCache(turbopackLoaderOptions)

  return {
    ...nextConfig,
    turbopack: addTurbopackRules(extraTurbopack, turbopackLoaderOptions),
    webpack(webpackConfig, webpackContext) {
      const loaderOptions = getLoaderOptions(nextImgConfig, {
        bundler: 'webpack',
        dir: webpackContext.dir,
        distDir: webpackContext.config.distDir,
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

      if (loaderOptions.maintenance) webpackConfig.cache = false

      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The Next.js webpack hook is optional external configuration.
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
      loaders: [
        {
          loader: path.join(__dirname, 'generated-asset-loader'),
          options: loaderOptions,
        },
      ],
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

function getLoaderOptions(pluginConfig, { bundler, dir, distDir, assetProxyDir }) {
  const {
    breakpoints,
    densities,
    formats,
    fallbackFormat,
    strict,
    maxBareImportSize,
    jpeg,
    png,
    webp,
    avif,
    imagesName,
    cacheDir,
    cache,
  } = pluginConfig
  const maintenanceSession = process.env.NEXT_IMG_MAINTENANCE || null
  const maintenance = maintenanceSession
    ? { session: maintenanceSession, force: process.env.NEXT_IMG_FORCE === '1' }
    : null

  return {
    breakpoints,
    densities,
    formats,
    fallbackFormat,
    strict,
    maxBareImportSize,
    jpeg,
    png,
    ...(webp && { webp }),
    avif,

    dir,
    distDir,
    bundler,
    ...(assetProxyDir && { assetProxyDir }),
    imagesName,
    cacheDir,
    cache,
    maintenance,
    assetStageDir: path.join(dir, '.next-img', 'assets'),
  }
}

function ensureTurbopackAssetProxies(projectDir) {
  const proxyDir = path.join(projectDir, '.next-img', 'proxies')
  fs.mkdirSync(proxyDir, { recursive: true })
  const proxyExtensions = new Set(OUTPUT_FORMATS.map(format => getFormat(format).outputExtension))
  for (const extension of proxyExtensions) {
    const proxyPath = path.join(proxyDir, `generated.${extension}`)
    if (!fs.existsSync(proxyPath)) fs.writeFileSync(proxyPath, '')
  }
  return proxyDir
}

function validateMaxBareImportSize(value) {
  if (value === false) return
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('next-img maxBareImportSize must be a positive integer or false')
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
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Output paths intentionally accept strings or filename callbacks.
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
  if (resourceQuery.constructor === Object) {
    return {
      ...resourceQuery,
      not: [...(resourceQuery.not || []), query],
    }
  }
  return { and: [resourceQuery, { not: [query] }] }
}

function assertPersistentCache(loaderOptions) {
  if (loaderOptions.maintenance && loaderOptions.cache.mode === 'off') {
    throw new Error('The next-img cache maintenance command cannot be used when cache.mode is "off"')
  }
}
