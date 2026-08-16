const qs = require('qs')
const { OUTPUT_FORMATS } = require('./formats')

const QUERY_KEYS = new Set(['sizes', 'densities', 'formats', 'fallbackFormat', ...OUTPUT_FORMATS])

function parseResourceQuery(query, { report = console.warn } = {}) {
  if (!query) return {}

  const parsed = qs.parse(query.replace(/^\?/, ''))
  const unknownKeys = Object.keys(parsed).filter(key => !QUERY_KEYS.has(key))
  if (unknownKeys.length > 0) {
    const suggestions = unknownKeys.map(key => {
      const suggestion = key === 'size' ? ' Did you mean "sizes"?' : ''
      return `"${key}".${suggestion}`
    })
    const message = `Unknown next-img import option ${suggestions.join(', ')}`
    report(message)
    for (const key of unknownKeys) delete parsed[key]
  }

  const transformed = {
    ...parsed,
    ...(parsed.sizes && { sizes: parseNumberList(parsed.sizes, 'sizes', { integer: true }) }),
    ...(parsed.densities && { densities: parseDensityList(parsed.densities) }),
    ...(parsed.formats && { formats: parseFormats(parsed.formats) }),
  }

  coerce(transformed)
  return transformed
}

function createTransformPlan(config, metadata) {
  const sourceWidth = metadata.autoOrient?.width || metadata.width
  const sourceHeight = metadata.autoOrient?.height || metadata.height
  if (!sourceWidth || !sourceHeight) {
    throw new Error('next-img could not determine the image dimensions')
  }
  const requestedSizes = config.sizes ? validateNumberList(config.sizes, 'sizes', { integer: true }) : null
  const densities = validateDensityList(config.densities || [1, 2])
  const candidates = []
  const processedWidths = new Set()

  const sizes = requestedSizes || [sourceWidth]
  for (const requestedSize of sizes) {
    const size = Math.min(sourceWidth, requestedSize)
    for (const density of densities) {
      const width = Math.min(sourceWidth, size * density)
      if (processedWidths.has(width)) continue
      processedWidths.add(width)
      candidates.push({ size, density, width })
    }
  }

  const fallbackFormat = normalizeFallbackFormat(config.fallbackFormat, metadata.format)
  const preferredFormats = validateFormats(config.formats || ['webp']).filter(format => format !== fallbackFormat)

  return {
    candidates,
    sizes: [...new Set(sizes.map(size => Math.min(sourceWidth, size)))],
    formats: [...preferredFormats, fallbackFormat],
    fallbackFormat,
    sourceWidth,
    sourceHeight,
  }
}

function getOutputOptions(config, sourceFormat, outputFormat) {
  const sourceOptions = config[sourceFormat] || {}
  if (outputFormat === sourceFormat) return withoutFormatOptions(sourceOptions)
  return sourceOptions[outputFormat] || withoutFormatOptions(config[outputFormat] || {})
}

function validateFormats(formats) {
  const values = Array.isArray(formats) ? formats : parseFormats(formats)
  const normalized = [...new Set(values.map(format => String(format).toLowerCase()))]
  const invalid = normalized.filter(format => !OUTPUT_FORMATS.includes(format))
  if (invalid.length > 0) {
    throw new Error(`Unsupported next-img output format: ${invalid.join(', ')}`)
  }
  return normalized
}

function normalizeFallbackFormat(format, sourceFormat) {
  if (!format || format === 'original') return sourceFormat
  return validateFormats([format])[0]
}

function parseFormats(value) {
  return String(value)
    .split(',')
    .map(format => format.trim())
    .filter(Boolean)
}

function parseNumberList(value, name, options) {
  return validateNumberList(String(value).split(','), name, options)
}

function validateNumberList(values, name, { integer = false } = {}) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`next-img option "${name}" must be a non-empty list`)
  }

  return values.map(value => {
    const number = Number(value)
    if (!Number.isFinite(number) || number <= 0 || (integer && !Number.isInteger(number))) {
      throw new Error(`Invalid next-img ${name} value: ${value}`)
    }
    return number
  })
}

function parseDensityList(value) {
  return validateDensityList(String(value).split(','))
}

function validateDensityList(values) {
  return validateNumberList(
    values.map(value => String(value).replace(/x$/i, '')),
    'densities',
  )
}

function withoutFormatOptions(options) {
  return Object.fromEntries(Object.entries(options).filter(([key]) => !OUTPUT_FORMATS.includes(key)))
}

function coerce(value) {
  if (!value || value.constructor !== Object) return

  for (const key of Object.keys(value)) {
    if (value[key] && value[key].constructor === Object) {
      coerce(value[key])
    } else if (value[key] === 'true') {
      value[key] = true
    } else if (value[key] === 'false') {
      value[key] = false
    } else {
      const number = Number(value[key])
      if (String(number) === value[key]) value[key] = number
    }
  }
}

module.exports = {
  OUTPUT_FORMATS,
  createTransformPlan,
  getOutputOptions,
  parseResourceQuery,
  validateFormats,
}
