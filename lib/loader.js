const qs = require('qs')
const path = require('path')
const sharp = require('sharp')
const { green } = require('kleur')
const deepmerge = require('deepmerge')
const loaderUtils = require('loader-utils')
const queue = require('./queue')
const assetStore = require('./asset-store')

const has = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
const overwriteMerge = (destinationArray, sourceArray, _options) => sourceArray
const merge = (...args) => deepmerge.all(args, { arrayMerge: overwriteMerge })

const processImage = queue()

const GENERATED_ASSET_QUERY = '__next_img_generated__'

const MIMES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
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
  const queryKeys = ['sizes', 'densities', 'jpeg', 'png', 'webp']
  const queryConfig = parseResourceQuery(this.resourceQuery, queryKeys)
  queryConfig.sizes = queryConfig.sizes || [Number.MAX_SAFE_INTEGER]
  const loaderConfig = this.getOptions()
  const config = merge({}, loaderConfig, queryConfig)

  // Some webpack loader context is also exposed by Turbopack's loader runner.
  const loaderContext = this
  const outputContext = loaderConfig.context || this.rootContext || (this.options && this.options.context)

  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase()

  if (!MIMES[ext]) {
    throw new Error('The extension ' + ext + ' is not currently supported')
  }

  const createFileName = ({ content, template, width, size, density, format }) => {
    const input = template.replace(/\[ext\]/gi, format === 'webp' ? 'webp' : ext)
    return loaderUtils
      .interpolateName(loaderContext, input, { context: outputContext, content })
      .replace(/\[width\]/gi, width)
      .replace(/\[size\]/gi, size)
      .replace(/\[density\]/gi, density + 'x')
  }

  const img = sharp(buffer)
  const metadata = await img.metadata()
  const images = []
  const imports = []
  const sizes = [...new Set(config.sizes.map(size => Math.min(metadata.width, size)))]
  const processedWidths = new Set()
  const originalFileName = createFileName({ template: '[name].[ext]' })

  for (const size of sizes) {
    for (let density of config.densities) {
      density = parseInt(density, 10)
      const width = Math.min(metadata.width, size * density)

      if (processedWidths.has(width)) continue
      processedWidths.add(width)

      const resize = async (outputFormat, outputOptions) => {
        const progress = `${green('wait')}  - processing image ${originalFileName} → ${size}@${density}x`

        // we run the resize operation, but wrap it in a caching wrapper
        const cacheKeyTpl = `[name]-[width]-[hash].[ext]`
        const cacheContent = Buffer.concat([buffer, Buffer.from(JSON.stringify(outputOptions), 'utf8')])
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
        const asset = addAssetImport(imports, filePath, assetPath)

        return { asset, ...attr }
      }

      const { webp: webpOutputOptions, ...outputOptions } = config[metadata.format] || {}
      const [orig, webp] = await Promise.all([
        resize(metadata.format, outputOptions),
        webpOutputOptions && resize('webp', webpOutputOptions),
      ])

      images.push(orig)
      if (webp) images.push(webp)
    }
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
const firstImage = images.find(image => image.format !== 'webp') || images[0]

module.exports = {
  src: firstImage.path,
  type: ${JSON.stringify(MIMES[(images.find(i => i.format !== 'webp') || images[0]).format])},
  srcSet: __nextImgSrcSet(images.filter(image => image.format !== 'webp')),
  webpSrcSet: __nextImgSrcSet(images.filter(image => image.format === 'webp')),
  images,
  name: ${JSON.stringify(originalFileName)},
  sizes: ${JSON.stringify(sizes)},
  breakpoints: ${JSON.stringify(config.breakpoints)},
}`
}

function addAssetImport(imports, filePath, assetPath) {
  const name = `__nextImgAsset${imports.length}`
  let request = path.relative(path.dirname(filePath), assetPath).split(path.sep).join('/')
  if (!request.startsWith('.')) request = `./${request}`
  imports.push(`const ${name} = require(${JSON.stringify(`${request}?${GENERATED_ASSET_QUERY}`)})`)
  return name
}

function parseResourceQuery(q, allowedKeys) {
  if (!q) return {}

  // extract ?sizes and ?densities from the query in a special way
  // that's more convenient to type
  const parsed = qs.parse(q.replace(/^\?/, ''))

  const densities = parsed.densities ? parsed.densities.split(',') : null
  delete parsed.densities

  const sizes = parsed.sizes ? parsed.sizes.split(',').map(s => parseInt(s, 10)) : null
  delete parsed.sizes

  const transformed = {
    ...parsed,
    ...(densities && { densities }),
    ...(sizes && { sizes }),
  }

  const final = {}
  for (const key of allowedKeys) {
    if (has(transformed, key)) {
      final[key] = transformed[key]
      coerce(final[key])
    }
  }
  return final
}

function coerce(obj) {
  for (const k of Object.keys(obj)) {
    if (isObject(obj[k])) {
      coerce(obj[k])
      continue
    }

    if (obj[k] === 'true') {
      obj[k] = true
      continue
    }

    if (obj[k] === 'false') {
      obj[k] = false
      continue
    }

    const asNumber = Number(obj[k])
    if (String(asNumber) === obj[k]) {
      obj[k] = asNumber
      continue
    }
  }
}

async function toFormat(img, format, options) {
  if (format === 'webp') {
    img = img.webp(options)
  } else if (format === 'jpeg') {
    img = img.jpeg(options)
  } else if (format === 'png') {
    img = img.png(options)
  } else {
    throw new Error(`Unknown output format ${format}`)
  }

  const { data, info } = await img.toBuffer({ resolveWithObject: true })

  return {
    data,
    width: info.width,
    height: info.height,
    format: info.format,
  }
}

function isObject(a) {
  return !!a && a.constructor === Object
}
