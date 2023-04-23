const qs = require('qs')
const path = require('path')
const fs = require('fs/promises')
const sharp = require('sharp')
const { green } = require('kleur')
const { rimraf } = require('rimraf')
const { mkdirp } = require('mkdirp')
const deepmerge = require('deepmerge')
const loaderUtils = require('loader-utils')
const debug = require('debug')('next-img')
const queue = require('./queue')

const has = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray
const merge = (...args) => deepmerge.all(args, { arrayMerge: overwriteMerge })

const processImage = queue()

// We use a global variable to keep track of processed images
// during production builds. This is so that we could reuse the
// existing cache, but then would know what can be removed at the end.
// Note - this is thread unsafe, but webpack/next doesn't do that by
// default at the moment, so this works
const gcConfig = {
  dir: null,
  distDir: null,
  cacheDir: null,
  processed: new Set(),
}

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

// when using the next-img cli, after the build is complete
// we call gc to keep only the files that were used by the build
module.exports.gc = gc

async function load(filePath, buffer) {
  // parse the configuration and combine the loader query config with that passed in via webpack config
  const queryKeys = ['sizes', 'densities', 'jpeg', 'png', 'webp']
  const queryConfig = parseResourceQuery(this.resourceQuery, queryKeys)
  queryConfig.sizes = queryConfig.sizes || [Number.MAX_SAFE_INTEGER]
  const loaderConfig = this.getOptions()
  const config = merge({}, loaderConfig, queryConfig)

  // some webpack voodoo
  const loaderContext = this
  const outputContext = loaderConfig.context || this.rootContext || (this.options && this.options.context)

  const ext = path.extname(filePath).replace(/^\./, '')

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

  const emitFile = (fileName, data) => {
    const { outputPath, publicPath } = getOutputAndPublicPath(fileName, config)
    loaderContext.emitFile(outputPath, data)
    return publicPath
  }

  const img = sharp(buffer)
  const metadata = await img.metadata()
  const images = []
  const originalFileName = createFileName({ template: '[name].[ext]' })

  for (let size of config.sizes) {
    size = Math.min(metadata.width, size)
    for (let density of config.densities) {
      density = parseInt(density, 10)
      const width = Math.min(metadata.width, size * density)

      const resize = async (outputFormat, outputOptions) => {
        const progress = `${green('wait')}  - processing image ${originalFileName} → ${size}@${density}x`

        // we run the resize operation, but wrap it in a caching wrapper
        const cacheKeyTpl = `[name]-[width]-[hash].[ext]`
        const cacheContent = Buffer.concat([buffer, Buffer.from(JSON.stringify(outputOptions), 'utf8')])
        const cacheKey = createFileName({ template: cacheKeyTpl, format: outputFormat, content: cacheContent, width })
        const res = () => toFormat(img.clone().resize(width, null), outputFormat, outputOptions)
        const { data, format, ...dimensions } = await cached(res, cacheKey, config, progress)

        // we got the processed buffer, emit the file to webpack build output
        const attr = { size, density, width: dimensions.width, height: dimensions.height, format }
        const fileName = createFileName({ template: config.imagesName, content: data, ...attr })
        const publicPath = emitFile(fileName, data)

        // and we're done, we have an image that can be embedded
        return { path: publicPath, ...attr }
      }

      const { webp: webpOutputOptions, ...outputOptions } = config[metadata.format]
      const [orig, webp] = await Promise.all([
        resize(metadata.format, outputOptions),
        webpOutputOptions && resize('webp', webpOutputOptions),
      ])

      images.push(orig)
      webp && images.push(webp)
    }
  }

  const firstImage = images.filter(i => i.format !== 'webp')[0] || images[0]
  return `module.exports = ${JSON.stringify({
    src: firstImage.path,
    type: MIMES[firstImage.format],
    srcSet: toSrcSet(images.filter(i => i.format !== 'webp')),
    webpSrcSet: toSrcSet(images.filter(i => i.format === 'webp')),
    images,
    name: originalFileName,
    sizes: [...new Set(images.map(i => i.size))],
    breakpoints: config.breakpoints,
  })}`
}

function toSrcSet(images) {
  return images.map(f => `${f.path} ${f.width}w`).join(', ') || null
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

function getOutputAndPublicPath(fileName, { outputPath: configOutputPath, publicPath: configPublicPath }) {
  let outputPath = fileName

  if (configOutputPath) {
    if (typeof configOutputPath === 'function') {
      outputPath = configOutputPath(fileName)
    } else {
      outputPath = path.posix.join(configOutputPath, fileName)
    }
  }

  let publicPath = `__webpack_public_path__ + ${JSON.stringify(outputPath)}`

  if (configPublicPath) {
    if (typeof configPublicPath === 'function') {
      publicPath = configPublicPath(fileName)
    } else if (configPublicPath.endsWith('/')) {
      publicPath = configPublicPath + fileName
    } else {
      publicPath = `${configPublicPath}/${fileName}`
    }
  }

  return {
    outputPath,
    publicPath,
  }
}

async function cached(fn, cacheKey, config, progressMessage) {
  const cacheDir = config.persistentCache
    ? path.join(config.dir, config.persistentCacheDir)
    : path.join(config.dir, config.distDir, config.cacheDir)
  const target = path.join(cacheDir, cacheKey)

  if (config.rebuildPersistentCache) {
    gcConfig.dir = config.dir
    gcConfig.distDir = config.distDir
    gcConfig.cacheDir = cacheDir
    gcConfig.processed.add(cacheKey)
  }

  try {
    const buffer = await fs.readFile(target)
    const info = await sharp(buffer).metadata()
    debug(`Cache hit ${cacheKey}`)
    return { data: buffer, width: info.width, height: info.height, format: info.format }
  } catch (err) {}

  if (config.failOnCacheMiss && !config.rebuildPersistentCache) {
    throw new Error(`Missing an optimised image ${cacheKey}. Make sure to rerun next-img.`)
  }

  console.log(progressMessage)
  debug(`Cache miss ${cacheKey}`)
  const ts = Date.now()
  const processed = await processImage(fn)
  await mkdirp(cacheDir)
  await fs.writeFile(target, processed.data)
  debug(`Processed ${cacheKey} in ${Date.now() - ts}ms`)
  return processed
}

async function gc() {
  if (!gcConfig.processed.size) {
    debug('No images found')
    return
  }

  const temp = path.join(gcConfig.dir, gcConfig.distDir, 'cache', 'next-img-temp')
  await rimraf(temp)
  await fs.rename(gcConfig.cacheDir, temp)
  await mkdirp(gcConfig.cacheDir)
  for (const f of gcConfig.processed) {
    await fs.rename(path.join(temp, f), path.join(gcConfig.cacheDir, f))
  }
  await rimraf(temp)
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
