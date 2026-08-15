const path = require('path')
const sharp = require('sharp')
const { green } = require('kleur')
const deepmerge = require('deepmerge')
const loaderUtils = require('loader-utils')
const queue = require('./queue')
const assetStore = require('./asset-store')
const { normalizeCacheConfig } = require('./cache-config')
const { MIME_TYPES, encode, getFormat, getInputFormat, getOutputExtension, normalizeSharpFormat } = require('./formats')
const { createTransformPlan, getOutputOptions, parseResourceQuery } = require('./image-options')

const overwriteMerge = (destinationArray, sourceArray, _options) => sourceArray
const merge = (...args) => deepmerge.all(args, { arrayMerge: overwriteMerge })

const processImage = queue()
const warnedBareImports = new Set()
const PIPELINE_VERSION = 2
const TOOLCHAIN_PACKAGES = ['sharp', 'vips', 'aom', 'heif', 'mozjpeg', 'png', 'webp', 'lcms', 'exif', 'zlib-ng']
const CACHE_KEY_TEMPLATE = '[name]-[width]-[xxhash64:hash:hex:16].[ext]'

const GENERATED_ASSET_QUERY = '__next_img_generated__'

module.exports = function loader(buffer) {
  const loaderCallback = this.async()
  const filePath = this.resourcePath
  load
    .call(this, filePath, buffer)
    .then(res => loaderCallback(null, res))
    .catch(err => loaderCallback(err))
}

module.exports.raw = true // get buffer stream instead of utf8 string

async function load(filePath, buffer) {
  // parse the configuration and combine the loader query config with that passed in via webpack config
  const loaderConfig = normalizeCacheConfig(this.getOptions())
  const report = createReporter(this, loaderConfig.strict)
  const queryConfig = parseResourceQuery(this.resourceQuery, { report })
  const config = merge({}, loaderConfig, queryConfig, {
    warn: report,
    processing: {
      pipelineVersion: PIPELINE_VERSION,
      ...(loaderConfig.cache.version != null && { cacheVersion: loaderConfig.cache.version }),
      toolchain: Object.fromEntries(
        TOOLCHAIN_PACKAGES.map(name => [name, sharp.versions[name]]).filter(([, version]) => version),
      ),
    },
  })

  // Some webpack loader context is also exposed by Turbopack's loader runner.
  const loaderContext = this
  const outputContext = loaderConfig.context || this.rootContext || (this.options && this.options.context)

  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase()

  if (!getInputFormat(ext)) {
    throw new Error('The extension ' + ext + ' is not currently supported')
  }

  const createFileName = ({ content, template, width, size, density, format }) => {
    const outputExt = getOutputExtension(format, metadata.format, ext)
    const input = template.replace(/\[ext\]/gi, outputExt || ext)
    return loaderUtils
      .interpolateName(loaderContext, input, { context: outputContext, content })
      .replace(/\[width\]/gi, width)
      .replace(/\[size\]/gi, size)
      .replace(/\[density\]/gi, density + 'x')
  }

  const rawMetadata = await sharp(buffer).metadata()
  const metadata = {
    ...rawMetadata,
    format: normalizeSharpFormat(rawMetadata),
  }
  const img = sharp(buffer).autoOrient()
  const images = []
  const imports = []
  const plan = createTransformPlan(config, metadata)
  const { sizes } = plan
  const originalFileName = createFileName({ template: '[name].[ext]' })
  validateBareImportSize(filePath, originalFileName, metadata, loaderConfig, queryConfig, report)

  for (const { size, density, width } of plan.candidates) {
    const resize = async (outputFormat, outputOptions) => {
      const progress = `${green('wait')}  - processing image ${originalFileName} → ${size}@${density}x (${outputFormat})`

      // we run the resize operation, but wrap it in a caching wrapper
      const cacheContent = createCacheContent(buffer, config, outputOptions, {
        processing: config.processing,
        autoOrient: true,
        width,
        format: outputFormat,
        options: outputOptions,
      })
      const cacheKey = createFileName({
        template: CACHE_KEY_TEMPLATE,
        format: outputFormat,
        content: cacheContent,
        width,
      })
      const res = () => encodeFormat(img.clone().resize(width, null), outputFormat, outputOptions)
      const { data, format, ...dimensions } = await assetStore.cached(
        () => processImage(res),
        cacheKey,
        config,
        progress,
      )

      const attr = { size, density, width: dimensions.width, height: dimensions.height, format }
      const fileName = createFileName({ template: config.imagesName, content: data, ...attr })
      const assetPath =
        config.bundler === 'turbopack'
          ? getAssetProxyPath(config.assetProxyDir, format)
          : await assetStore.stage(fileName, data, config)
      loaderContext.addDependency?.(assetPath)
      const asset = addAssetImport(imports, filePath, assetPath, cacheKey)

      return { asset, ...attr }
    }

    const processingFormats = [plan.fallbackFormat, ...plan.formats.filter(format => format !== plan.fallbackFormat)]
    images.push(
      ...(await Promise.all(
        processingFormats.map(format => resize(format, getOutputOptions(config, metadata.format, format))),
      )),
    )
  }

  const imageEntries = images.map(({ asset, ...attr }) => {
    return `{ ...${JSON.stringify(attr)}, path: __nextImgUrl(${asset}) }`
  })

  return `${imports.join('\n')}

function __nextImgUrl(asset) {
  if (typeof asset === 'string') return asset
  if (typeof asset?.default === 'string') return asset.default
  if (typeof asset?.default?.src === 'string') return asset.default.src
  if (typeof asset?.src === 'string') return asset.src
  throw new Error('next-img could not resolve a generated asset URL')
}

function __nextImgSrcSet(images) {
  return images.map(image => \`${'${image.path} ${image.width}w'}\`).join(', ') || null
}

const images = [${imageEntries.join(',\n')}]
const formats = ${JSON.stringify(plan.formats)}
const fallbackFormat = ${JSON.stringify(plan.fallbackFormat)}
const groupedImages = Object.fromEntries(formats.map(format => [format, images.filter(image => image.format === format)]))
const sources = Object.fromEntries(formats.map(format => [format, {
  type: ${JSON.stringify(MIME_TYPES)}[format],
  srcSet: __nextImgSrcSet(groupedImages[format]),
  images: groupedImages[format],
}]))
const fallbackImages = groupedImages[fallbackFormat]
const firstImage = fallbackImages[0] || images[0]

module.exports = {
  src: firstImage.path,
  width: ${plan.sourceWidth},
  height: ${plan.sourceHeight},
  format: fallbackFormat,
  type: ${JSON.stringify(MIME_TYPES)}[fallbackFormat],
  srcSet: __nextImgSrcSet(fallbackImages),
  webpSrcSet: sources.webp?.srcSet || null,
  avifSrcSet: sources.avif?.srcSet || null,
  sources,
  formats,
  fallbackFormat,
  images,
  name: ${JSON.stringify(originalFileName)},
  sizes: ${JSON.stringify(sizes)},
  breakpoints: ${JSON.stringify(config.breakpoints)},
}`
}

function addAssetImport(imports, filePath, assetPath, cacheKey) {
  const name = `__nextImgAsset${imports.length}`
  let request = path.relative(path.dirname(filePath), assetPath).split(path.sep).join('/')
  if (!request.startsWith('.')) request = `./${request}`
  const query = new URLSearchParams({ [GENERATED_ASSET_QUERY]: '', key: cacheKey })
  imports.push(`const ${name} = require(${JSON.stringify(`${request}?${query}`)})`)
  return name
}

function getAssetProxyPath(proxyDir, format) {
  if (!proxyDir) throw new Error('next-img is missing its Turbopack asset proxy directory')
  return path.join(proxyDir, `generated.${getFormat(format).outputExtension}`)
}

async function encodeFormat(image, format, options) {
  return { ...(await toBufferResult(encode(image, format, options))), format }
}

async function toBufferResult(img) {
  const { data, info } = await img.toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height, format: info.format }
}

function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`
  if (value && value.constructor === Object) {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function createCacheContent(buffer, config, persistentIdentity, ephemeralIdentity) {
  // Keep JSON.stringify and the released codec-options shape for persistent
  // paths. Width and format live in the path; processing changes are refreshed
  // in place through the manifest instead of renaming every derivative.
  const serializedIdentity =
    config.cache.mode !== 'off' ? JSON.stringify(persistentIdentity) : canonicalStringify(ephemeralIdentity)
  return Buffer.concat([buffer, Buffer.from(serializedIdentity, 'utf8')])
}

function validateBareImportSize(filePath, originalFileName, metadata, loaderConfig, queryConfig, report) {
  const limit = loaderConfig.maxBareImportSize ?? 2048
  if (limit === false || loaderConfig.widths || queryConfig.widths || queryConfig.sizes) return

  const width = metadata.autoOrient?.width || metadata.width
  const height = metadata.autoOrient?.height || metadata.height
  if (!width || !height || Math.max(width, height) <= limit) return

  const message =
    `next-img imported ${originalFileName} at its intrinsic ${width}×${height} size because no sizes or widths ` +
    `were provided. Add ?widths=... or ?sizes=..., increase nextImg.maxBareImportSize above ${limit}, or set it ` +
    `to false to disable this check.`
  const warningKey = `${filePath}:${width}:${height}:${limit}`
  if (warnedBareImports.has(warningKey)) return
  report(message)
  warnedBareImports.add(warningKey)
}

function createReporter(loaderContext, strict) {
  return message => {
    const error = new Error(message)
    if (strict) throw error
    if (typeof loaderContext.emitWarning === 'function') loaderContext.emitWarning(error)
    else console.warn(message)
  }
}
