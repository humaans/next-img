const path = require('path')
const mkdirp = require('mkdirp')
const { promises: fs } = require('fs')
const deepmerge = require('deepmerge')
const loaderUtils = require('loader-utils')
const querystring = require('querystring')
const debug = require('debug')('next-img')
const ora = require('ora')
const sharp = require('./sharp')

const has = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray
const merge = (...args) => deepmerge.all(args, { arrayMerge: overwriteMerge })

const spinner = ora('processing images ...')

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
    return loaderUtils
      .interpolateName(loaderContext, template, { context: outputContext, content })
      .replace(/\[width\]/gi, width)
      .replace(/\[size\]/gi, size)
      .replace(/\[density\]/gi, density + 'x')
      .replace(/\[ext\]/gi, format === 'webp' ? 'webp' : ext)
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

  spinner.text = `processing image ${originalFileName}...`
  spinner.start()

  for (let size of config.sizes) {
    size = Math.min(metadata.width, parseInt(size, 10))
    for (let density of config.densities) {
      density = parseInt(density, 10)
      const width = Math.min(metadata.width, size * density)

      const resize = async output => {
        spinner.text = `processing image ${originalFileName} → ${size}@${density}x...`

        // we pass resize options to sharp/advpng to control quality
        const resizeOptions = config[output]

        // we run the resize operation, but wrap it in a caching wrapper
        const cacheKeyTpl = `next-img-[name]@[width]w-[hash]-[optionsHash].[ext]`
        const cacheContent = Buffer.concat([buffer, Buffer.from(JSON.stringify(resizeOptions), 'utf8')])
        const cacheKey = createFileName({ template: cacheKeyTpl, format: output, content: cacheContent, width })
        const res = () => img.resize({ width, output, options: resizeOptions })
        const { data, format, ...dimensions } = await cached(res, cacheKey, config)

        // we got the processed buffer, emit the file to webpack build output
        const attr = { size, density, width: dimensions.width, height: dimensions.height, format }
        const fileName = createFileName({ template: config.name, content: data, ...attr })
        const publicPath = emitFile(fileName, data)

        // and we're done, we have an image that can be embedded
        return { path: publicPath, ...attr }
      }

      images.push(await resize(metadata.format))
      images.push(await resize('webp'))
    }
  }

  spinner.stop()

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
  const parsed = querystring.parse(q.replace(/^\?/, ''))
  const sizes = parsed.sizes ? parsed.sizes.split(',').map(s => parseInt(s, 10)) : null
  delete parsed.sizes
  const densities = parsed.densities ? parsed.densities.split(',') : null
  delete parsed.densities
  const stringified = querystring.stringify(parsed)

  const transformed = {
    ...loaderUtils.parseQuery(`?${stringified}`),
    ...(sizes && { sizes }),
    ...(densities && { densities }),
  }

  const final = {}
  for (const key of allowedKeys) {
    if (has(transformed, key)) {
      final[key] = transformed[key]
    }
  }
  return final
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
  const { cacheDir, persistentCacheDir, usePersistentCache, rebuildPersistentCache } = config

  const filePath = path.join(cacheDir, cacheKey)
  let cached, info
  try {
    cached = await fs.readFile(filePath)
    info = await sharp(cached).metadata()
    debug(`Cache hit ${filePath}`)
    return { data: cached, width: info.width, height: info.height, format: info.format }
  } catch (err) {}

  if (!cached) {
    debug(`Cache miss ${filePath}`)
    const ts = Date.now()
    const processed = await fn()
    await mkdirp(cacheDir)
    await fs.writeFile(filePath, processed.data)
    debug(`Processed ${filePath} in ${Date.now() - ts}ms`)

    return processed
  }
}
