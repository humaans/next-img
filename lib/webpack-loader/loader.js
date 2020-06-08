const path = require('path')
const del = require('del')
const mkdirp = require('mkdirp')
const { promises: fs } = require('fs')
const deepmerge = require('deepmerge')
const loaderUtils = require('loader-utils')
const qs = require('qs')
const debug = require('debug')('next-img')
const ora = require('ora')
const { default: PQueue } = require('p-queue')
const sharp = require('./sharp')

const os = require('os')
const cpuCount = os.cpus().length
const imageProcessingQueue = new PQueue({ concurrency: cpuCount })

const has = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray
const merge = (...args) => deepmerge.all(args, { arrayMerge: overwriteMerge })

// We use a global variable to keep track of processed images
// during production builds. This is so that we could reuse the
// existing cache, but then would know what can be removed at the end.
// Note - this is thread unsafe, but webpack/next doesn't do that by
// default at the moment, so this works
const gcConfig = {
  cacheDir: null,
  distDir: null,
  processed: new Set(),
}

const spinner = ora('processing images ...')
const spinners = []

function started(text, dev, rebuildPersistentCache) {
  if (!dev) {
    if (rebuildPersistentCache) {
      console.log(text)
    }
    return
  }

  spinners.push(text)
  spinner.text = text

  if (spinners.length === 1) {
    spinner.start()
  }
}

function finished(text, dev) {
  if (!dev) {
    return
  }

  const i = spinners.indexOf(text)
  spinners.splice(i, 1)

  if (spinners.length === 0) {
    spinner.stop()
  } else {
    spinner.text = spinners[spinners.length - 1]
  }
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
  const loaderConfig = loaderUtils.getOptions(this)
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

      const resize = async (output, resizeOptions) => {
        const progress = `processing image ${originalFileName} → ${size}@${density}x ...`
        started(progress, config.dev, config.rebuildPersistentCache)

        // we run the resize operation, but wrap it in a caching wrapper
        const cacheKeyTpl = `[name]-[width]-[hash].[ext]`
        const cacheContent = Buffer.concat([buffer, Buffer.from(JSON.stringify(resizeOptions), 'utf8')])
        const cacheKey = createFileName({ template: cacheKeyTpl, format: output, content: cacheContent, width })
        const res = () => img.resize({ width, output, options: resizeOptions })
        const { data, format, ...dimensions } = await cached(res, cacheKey, config)

        // we got the processed buffer, emit the file to webpack build output
        const attr = { size, density, width: dimensions.width, height: dimensions.height, format }
        const fileName = createFileName({ template: config.name, content: data, ...attr })
        const publicPath = emitFile(fileName, data)

        finished(progress, config.dev)
        // and we're done, we have an image that can be embedded
        return { path: publicPath, ...attr }
      }

      const { webp: webpResizeOptions, ...resizeOptions } = config[metadata.format]
      const [orig, webp] = await Promise.all([
        resize(metadata.format, resizeOptions),
        webpResizeOptions && resize('webp', webpResizeOptions),
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
  const sizes = parsed.sizes ? parsed.sizes.split(',').map(s => parseInt(s, 10)) : null
  delete parsed.sizes
  const densities = parsed.densities ? parsed.densities.split(',') : null
  delete parsed.densities

  const transformed = {
    ...parsed,
    ...(sizes && { sizes }),
    ...(densities && { densities }),
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
    const asNumber = Number(obj[k])
    if (String(asNumber) === obj[k]) {
      obj[k] = asNumber
      continue
    }
    const asBool = Boolean(obj[k])
    if (String(asBool) === obj[k]) {
      obj[k] = asBool
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

async function cached(fn, cacheKey, config) {
  const cacheDir = config.persistentCacheDir || config.cacheDir
  const target = path.join(cacheDir, cacheKey)

  if (config.rebuildPersistentCache) {
    gcConfig.cacheDir = cacheDir
    gcConfig.distDir = config.distDir
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

  debug(`Cache miss ${cacheKey}`)
  const ts = Date.now()
  const processed = await imageProcessingQueue.add(() => fn())
  await mkdirp(cacheDir)
  await fs.writeFile(target, processed.data)
  debug(`Processed ${cacheKey} in ${Date.now() - ts}ms`)
  return processed
}

async function gc() {
  const temp = path.join(gcConfig.distDir, 'cache', 'next-img-temp')
  await del(temp)
  await fs.rename(gcConfig.cacheDir, temp)
  await mkdirp(gcConfig.cacheDir)
  for (const f of gcConfig.processed) {
    await fs.rename(path.join(temp, f), path.join(gcConfig.cacheDir, f))
  }
  await del(temp)
}
