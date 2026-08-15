const FORMATS = Object.freeze({
  avif: Object.freeze({ extensions: ['avif'], outputExtension: 'avif', mime: 'image/avif' }),
  webp: Object.freeze({ extensions: ['webp'], outputExtension: 'webp', mime: 'image/webp' }),
  jpeg: Object.freeze({ extensions: ['jpg', 'jpeg'], outputExtension: 'jpg', mime: 'image/jpeg' }),
  png: Object.freeze({ extensions: ['png'], outputExtension: 'png', mime: 'image/png' }),
})

const OUTPUT_FORMATS = Object.freeze(Object.keys(FORMATS))
const INPUT_EXTENSIONS = Object.freeze(OUTPUT_FORMATS.flatMap(format => FORMATS[format].extensions))
const FORMAT_BY_EXTENSION = Object.freeze(
  Object.fromEntries(
    OUTPUT_FORMATS.flatMap(format => FORMATS[format].extensions.map(extension => [extension, format])),
  ),
)
const MIME_TYPES = Object.freeze(Object.fromEntries(OUTPUT_FORMATS.map(format => [format, FORMATS[format].mime])))

function getFormat(format) {
  const definition = FORMATS[format]
  if (!definition) throw new Error(`Unknown output format ${format}`)
  return definition
}

function getInputFormat(extension) {
  return FORMAT_BY_EXTENSION[extension.toLowerCase()] || null
}

function getOutputExtension(format, sourceFormat, sourceExtension) {
  if (!format) return sourceExtension
  return format === sourceFormat ? sourceExtension : getFormat(format).outputExtension
}

function normalizeSharpFormat(metadata) {
  return metadata.mediaType === FORMATS.avif.mime ? 'avif' : metadata.format
}

function encode(image, format, options) {
  getFormat(format)
  return image[format](options)
}

module.exports = {
  FORMATS,
  INPUT_EXTENSIONS,
  MIME_TYPES,
  OUTPUT_FORMATS,
  encode,
  getFormat,
  getInputFormat,
  getOutputExtension,
  normalizeSharpFormat,
}
