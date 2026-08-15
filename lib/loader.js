const path = require('path')
const sharp = require('sharp')
const { green } = require('kleur')
const deepmerge = require('deepmerge')
const loaderUtils = require('loader-utils')
const queue = require('./queue')
const assetStore = require('./asset-store')
const { createTransformPlan, getOutputOptions, parseResourceQuery } = require('./image-options')

const overwriteMerge = (destinationArray, sourceArray, _options) => sourceArray
const merge = (...args) => deepmerge.all(args, { arrayMerge: overwriteMerge })

const processImage = queue()
const PIPELINE_VERSION = 2

const GENERATED_ASSET_QUERY = '__next_img_generated__'

const MIMES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
}

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
  const loaderConfig = this.getOptions()
  const queryConfig = parseResourceQuery(this.resourceQuery, { strict: loaderConfig.strict })
  const config = merge({}, loaderConfig, queryConfig)

  // Some webpack loader context is also exposed by Turbopack's loader runner.
  const loaderContext = this
  const outputContext = loaderConfig.context || this.rootContext || (this.options && this.options.context)

  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase()

  if (!MIMES[ext]) {
    throw new Error('The extension ' + ext + ' is not currently supported')
  }

  const createFileName = ({ content, template, width, size, density, format }) => {
    const outputExt = format === metadata.format ? ext : format === 'jpeg' ? 'jpg' : format
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
    format: rawMetadata.mediaType === 'image/avif' ? 'avif' : rawMetadata.format,
  }
  const img = sharp(buffer).autoOrient()
  const images = []
  const imports = []
  const plan = createTransformPlan(config, metadata)
  const { sizes } = plan
  const originalFileName = createFileName({ template: '[name].[ext]' })

  for (const { size, density, width } of plan.candidates) {
    const resize = async (outputFormat, outputOptions) => {
      const progress = `${green('wait')}  - processing image ${originalFileName} → ${size}@${density}x (${outputFormat})`

      // we run the resize operation, but wrap it in a caching wrapper
      const cacheKeyTpl = `[name]-[width]-[hash].[ext]`
      const transform = {
        pipelineVersion: PIPELINE_VERSION,
        sharpVersion: sharp.versions.sharp,
        autoOrient: true,
        width,
        format: outputFormat,
        options: outputOptions,
      }
      const cacheContent = Buffer.concat([buffer, Buffer.from(canonicalStringify(transform), 'utf8')])
      const cacheKey = createFileName({ template: cacheKeyTpl, format: outputFormat, content: cacheContent, width })
      const res = () => toFormat(img.clone().resize(width, null), outputFormat, outputOptions)
      const { data, format, ...dimensions } = await assetStore.cached(
        () => processImage(res),
        cacheKey,
        config,
        progress,
      )

      // Materialize an importable asset. The generated module imports this
      // file, allowing either webpack or Turbopack to emit it normally.
      const attr = { size, density, width: dimensions.width, height: dimensions.height, format }
      const fileName = createFileName({ template: config.imagesName, content: data, ...attr })
      const assetPath = await assetStore.stage(fileName, data, config)
      loaderContext.addDependency?.(assetPath)
      const asset = addAssetImport(imports, filePath, assetPath)

      return { asset, ...attr }
    }

    const processingFormats = [plan.fallbackFormat, ...plan.formats.filter(format => format !== plan.fallbackFormat)]
    images.push(
      ...(await Promise.all(
        processingFormats.map(format => resize(format, getOutputOptions(config, metadata.format, format))),
      )),
    )
  }

  const placeholder = config.placeholder
    ? await createPlaceholder({ buffer, config, originalFileName, createFileName })
    : null

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
  type: ${JSON.stringify(MIMES)}[format],
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
  type: ${JSON.stringify(MIMES)}[fallbackFormat],
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
  blurDataURL: ${JSON.stringify(placeholder)},
}`
}

async function createPlaceholder({ buffer, config, originalFileName, createFileName }) {
  const width = Number(config.placeholderSize || 16)
  const options = { quality: 20 }
  const transform = {
    pipelineVersion: PIPELINE_VERSION,
    sharpVersion: sharp.versions.sharp,
    autoOrient: true,
    width,
    format: 'webp',
    placeholder: true,
    options,
  }
  const cacheContent = Buffer.concat([buffer, Buffer.from(canonicalStringify(transform), 'utf8')])
  const cacheKey = createFileName({
    template: '[name]-placeholder-[hash].[ext]',
    format: 'webp',
    content: cacheContent,
    width,
  })
  const result = await assetStore.cached(
    async () => {
      const image = sharp(buffer).autoOrient().resize({ width, withoutEnlargement: true }).webp(options)
      return toBufferResult(image)
    },
    cacheKey,
    config,
    `${green('wait')}  - processing placeholder ${originalFileName}`,
  )
  return `data:${MIMES[result.format]};base64,${result.data.toString('base64')}`
}

function addAssetImport(imports, filePath, assetPath) {
  const name = `__nextImgAsset${imports.length}`
  let request = path.relative(path.dirname(filePath), assetPath).split(path.sep).join('/')
  if (!request.startsWith('.')) request = `./${request}`
  imports.push(`const ${name} = require(${JSON.stringify(`${request}?${GENERATED_ASSET_QUERY}`)})`)
  return name
}

async function toFormat(img, format, options) {
  if (format === 'avif') {
    img = img.avif(options)
  } else if (format === 'webp') {
    img = img.webp(options)
  } else if (format === 'jpeg') {
    img = img.jpeg(options)
  } else if (format === 'png') {
    img = img.png(options)
  } else {
    throw new Error(`Unknown output format ${format}`)
  }

  return { ...(await toBufferResult(img)), format }
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
