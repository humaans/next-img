const React = require('react')

const h = React.createElement

const Picture = React.forwardRef(function Picture(
  {
    src,
    sources,
    sizes,
    breakpoints,
    pictureProps,
    priority = false,
    autoSizes = false,
    loading,
    decoding,
    fetchPriority,
    ...imgProps
  },
  ref,
) {
  const pictureSources = sources
    ? normalizeExplicitSources(sources, src, sizes)
    : normalizeLegacySources(src, sizes, breakpoints)
  if (pictureSources.length === 0) return null

  const fallback = pictureSources[pictureSources.length - 1]
  const fallbackFormat = getFallbackSource(fallback.img)
  const fallbackImage = fallbackFormat.images[0] || fallback.img.images?.[0]
  const resolvedLoading = loading ?? (priority ? 'eager' : undefined)
  const resolvedDecoding = decoding ?? (priority ? 'sync' : 'async')
  const resolvedFetchPriority = fetchPriority ?? (priority ? 'high' : undefined)
  const fallbackSizes = resolveSizes(fallback, autoSizes, resolvedLoading)

  return h(
    'picture',
    pictureProps || {},
    pictureSources.flatMap((source, sourceIndex) => {
      const formatSources = getFormatSources(source.img)
      const fallbackSource = getFallbackSource(source.img)

      return formatSources
        .filter(formatSource => pictureSources.length > 1 || formatSource.format !== fallbackSource.format)
        .map(formatSource =>
          h('source', {
            key: `${sourceIndex}:${formatSource.format}`,
            type: formatSource.type,
            srcSet: formatSource.srcSet,
            sizes: resolveSizes(source, autoSizes, resolvedLoading),
            ...(source.media ? { media: source.media } : {}),
            ...(pictureSources.length > 1 ? getDimensions(formatSource.images[0]) : {}),
          }),
        )
    }),
    h('img', {
      ...imgProps,
      ref,
      src: fallback.img.src,
      srcSet: fallbackFormat.srcSet || fallback.img.srcSet,
      sizes: fallbackSizes,
      ...getDimensions(fallbackImage),
      loading: resolvedLoading,
      decoding: resolvedDecoding,
      fetchPriority: resolvedFetchPriority,
    }),
  )
})

function normalizeLegacySources(src, sizes, breakpoints) {
  const images = normalizeSrc(src)
  if (images.length === 0) return []

  const normalizedSizes = Array.isArray(sizes) ? sizes : [sizes]
  const normalizedBreakpoints = breakpoints || images[0].breakpoints || []
  return flattenSrc(images, normalizedSizes, normalizedBreakpoints).map(source => ({
    ...source,
    media: source.maxWidth ? makeMedia(source.maxWidth) : null,
  }))
}

function normalizeExplicitSources(sources, fallbackSrc, sizes) {
  const normalized = []
  for (const [index, source] of sources.entries()) {
    if (!source || !source.src) {
      throw new Error(`next-img Picture source at index ${index} must provide a src`)
    }
    normalized.push({
      img: unwrapModule(source.src),
      sizes: source.sizes ?? (Array.isArray(sizes) ? sizes[index] : sizes),
      breakpoints: [],
      media: source.media || null,
    })
  }

  const fallback = normalizeSrc(fallbackSrc)
  if (fallback.length > 0) {
    normalized.push({
      img: fallback[fallback.length - 1],
      sizes: Array.isArray(sizes) ? sizes[normalized.length] : sizes,
      breakpoints: [],
      media: null,
    })
  }
  if (normalized.length > 0 && normalized[normalized.length - 1].media) {
    throw new Error('next-img Picture sources must end with an unconditional fallback or be paired with src')
  }
  return normalized
}

function normalizeSrc(src) {
  if (!src) return []
  return (Array.isArray(src) ? src : [src]).filter(Boolean).map(unwrapModule)
}

function unwrapModule(src) {
  return src && src.default ? src.default : src
}

function getFormatSources(img) {
  if (img.sources && img.formats) {
    return img.formats.map(format => ({ format, ...img.sources[format] })).filter(source => source.srcSet)
  }

  const sources = []
  if (img.webpSrcSet) {
    sources.push({ format: 'webp', type: 'image/webp', srcSet: img.webpSrcSet, images: getImages(img, 'webp') })
  }
  if (img.srcSet) {
    sources.push({
      format: getFormatFromType(img.type),
      type: img.type,
      srcSet: img.srcSet,
      images: (img.images || []).filter(image => image.format !== 'webp'),
    })
  }
  return sources
}

function getFallbackSource(img) {
  const sources = getFormatSources(img)
  return (
    sources.find(source => source.format === img.fallbackFormat) ||
    sources[sources.length - 1] || {
      format: img.format,
      type: img.type,
      srcSet: img.srcSet,
      images: img.images || [],
    }
  )
}

function getImages(img, format) {
  return (img.images || []).filter(image => image.format === format)
}

function getFormatFromType(type) {
  return type ? type.replace(/^image\//, '').replace('jpg', 'jpeg') : null
}

function getDimensions(image) {
  return image?.width && image?.height ? { width: image.width, height: image.height } : {}
}

function resolveSizes(source, autoSizes, loading) {
  const value = makeSizes(source.img, source.sizes, source.breakpoints)
  if (!autoSizes || loading !== 'lazy' || !value || /^auto(?:,|$)/.test(value)) return value
  return `auto, ${value}`
}

function flattenSrc(src, sizes, breakpoints) {
  const result = []

  for (let i = 0; i < src.length; i++) {
    if (i > breakpoints.length) {
      console.warn(`Image ${src[i].name} was not included due to insufficient breakpoints.`)
      continue
    }

    result.push({
      img: src[i],
      sizes: sizes[i],
      breakpoints: src.length === 1 ? breakpoints : [],
      maxWidth: i === src.length - 1 ? null : breakpoints[i],
    })
  }

  return result
}

function makeSizes(img, sizes, breakpoints = []) {
  if (sizes) return sizes
  if (!img.sizes) return undefined

  return img.sizes
    .reduce((acc, size, index) => {
      if (index > breakpoints.length) {
        console.warn(`The ${img.name} @ ${size}w will never be shown due to insufficient breakpoints.`)
        return acc
      }

      return breakpoints[index] && img.sizes.length - 1 > index
        ? acc.concat(`${makeMedia(breakpoints[index])} ${size}px`)
        : acc.concat(`${size}px`)
    }, [])
    .join(', ')
}

function makeMedia(breakpoint) {
  return typeof breakpoint === 'number' ? `(max-width: ${breakpoint}px)` : breakpoint
}

module.exports = { Picture, makeSizes, flattenSrc }
