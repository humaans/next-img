const path = require('path')
const loaderUtils = require('loader-utils')
const querystring = require('querystring')

const hasProp = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)

const MIMES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const EXTS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const getOutputAndPublicPath = (fileName, { outputPath: configOutputPath, publicPath: configPublicPath }) => {
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

module.exports = function loader(content) {
  const loaderCallback = this.async()
  load
    .call(this, content)
    .then(res => loaderCallback(null, res))
    .catch(err => loaderCallback(err))
}

async function load(content) {
  // console.log({ content })
  const { sizes = [Number.MAX_SAFE_INTEGER], ...query } = parseResourceQuery(this.resourceQuery)
  const config = Object.assign({}, loaderUtils.getOptions(this), query)

  const outputContext = config.context || this.rootContext || (this.options && this.options.context)
  // JPEG compression
  const quality = parseInt(config.quality, 10) || 85
  // Useful when converting from PNG to JPG
  // Specify mimetype to convert to another format
  let mime
  let ext
  if (config.format) {
    if (!hasProp(MIMES, config.format)) {
      throw new Error('Format "' + config.format + '" not supported')
    }
    mime = MIMES[config.format]
    ext = EXTS[mime]
  } else {
    ext = path.extname(this.resourcePath).replace(/\./, '')
    mime = MIMES[ext]
    if (!mime) {
      throw new Error('No mime type for file with extension ' + ext + 'supported')
    }
  }

  const name = config.name.replace(/\[ext\]/gi, ext)

  const adapter = require('./sharp')
  const loaderContext = this

  // The config that is passed to the adatpers
  const adapterOptions = Object.assign({}, config, {
    quality,
  })

  const densities = config.densities
  const breakpoints = config.breakpoints
  const cacheDirectory = config.cacheDirectory

  // if (config.original) {
  //   // emit original content only
  //   const fileName = loaderUtils
  //     .interpolateName(loaderContext, name, {
  //       context: outputContext,
  //       content: content,
  //     })
  //     .replace(/\[width\]/gi, '100')
  //     .replace(/\[height\]/gi, '100')

  //   const { outputPath, publicPath } = getOutputAndPublicPath(fileName, config)

  //   loaderContext.emitFile(outputPath, content)

  //   // TODO - fix
  //   return (
  //     'module.exports = {srcSet:' +
  //     publicPath +
  //     ',images:[{path:' +
  //     publicPath +
  //     ',width:100,height:100}],src: ' +
  //     publicPath +
  //     '};'
  //   )
  // }

  const emitFile = ({ fileName, data, width, size, density, mime, format }) => {
    const publicFileName = createFileName({ content: data, width, size, density, mime })
    const { outputPath, publicPath } = getOutputAndPublicPath(publicFileName, config)

    loaderContext.emitFile(outputPath, data)

    return {
      path: publicPath,
      name: createFileName({ width, size, density, mime, name: '[name]-[size]@[density].[ext]' }),
      originalName: createFileName({ width, size, density, name: '[name].[ext]' }),
      size,
      width,
      format,
    }
  }

  const createFileName = ({ content, width, size, density, mime, name: providedName }) => {
    let fileName = loaderUtils
      .interpolateName(loaderContext, providedName || name, {
        context: outputContext,
        content: content,
      })
      .replace(/\[width\]/gi, width)
      .replace(/\[size\]/gi, size)
      .replace(/\[density\]/gi, density + 'x')

    if (mime === 'image/webp') {
      fileName = fileName.replace('.jpg', '.webp')
      fileName = fileName.replace('.png', '.webp')
    }

    return fileName

    // // console.log(loaderContext)

    // const { outputPath, publicPath } = getOutputAndPublicPath(fileName, config)

    // // loaderContext.emitFile(outputPath, data)

    // return {
    //   path: publicPath,
    //   size,
    //   width,
    //   format,
    // }
  }

  const img = adapter(content)

  const metadata = await img.metadata()
  const promises = []
  const widthsToGenerate = new Set()

  for (let size of sizes) {
    size = Math.min(metadata.width, parseInt(size, 10))
    for (let density of densities) {
      density = parseInt(density, 10)
      const width = Math.min(metadata.width, size * density)

      // Only resize images if they aren't an exact copy of one already being resized...
      if (!widthsToGenerate.has(width)) {
        widthsToGenerate.add(width)
        promises.push(
          img.resize({
            fileName: createFileName({ content, width, size, density, mime }),
            cacheDirectory,
            width,
            size,
            density,
            mime,
            options: adapterOptions,
          }),
        )
        promises.push(
          img.resize({
            fileName: createFileName({ content, width, size, density, mime: 'image/webp' }),
            cacheDirectory,
            width,
            size,
            density,
            mime: 'image/webp',
            options: adapterOptions,
            source: mime,
          }),
        )
      }
    }
  }

  const images = await Promise.all(promises).then(results => results.map(emitFile))

  const srcSet = toSrcSet(images.filter(i => i.format !== 'webp'))
  const webpSrcSet = toSrcSet(images.filter(i => i.format === 'webp'))
  const firstImage = images.filter(i => i.format !== 'webp')[0] || images[0]
  const src = firstImage.path
  const type = MIMES[firstImage.format]
  return `module.exports = ${JSON.stringify({
    src,
    srcSet,
    webpSrcSet,
    type,
    images,
    name: firstImage.originalName,
    sizes: [...new Set(images.map(i => i.size))],
    breakpoints,
  })}`
}

function toSrcSet(images) {
  return images.map(f => `${f.path} ${f.width}w`).join(', ') || null
}

function parseResourceQuery(q) {
  if (!q) return {}

  // extract ?sizes and ?densities from the query in a special way
  // that's more convenient tp type
  const parsed = querystring.parse(q.replace(/^\?/, ''))
  const sizes = parsed.sizes ? parsed.sizes.split(',').map(s => parseInt(s, 10)) : null
  delete parsed.sizes
  const densities = parsed.densities ? parsed.densities.split(',') : null
  delete parsed.densities
  const stringified = querystring.stringify(parsed)

  return { ...loaderUtils.parseQuery(`?${stringified}`), ...(sizes && { sizes }), ...(densities && { densities }) }
}

module.exports.raw = true // get buffer stream instead of utf8 string

// const hash = crypto.createHash("md4");

//   const contents = JSON.stringify({ source, options, identifier });

//   hash.update(contents);

//   return hash.digest("hex") + ".json";
