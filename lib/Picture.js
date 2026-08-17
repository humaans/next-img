const React = require('react')
const ReactDOM = require('react-dom')

const h = React.createElement

const Picture = React.forwardRef(function Picture(
  { src, sources, sizes, breakpoints, pictureProps, preload = false, loading, decoding, fetchPriority, ...imgProps },
  ref,
) {
  const pictureSources = sources
    ? normalizeExplicitSources(sources, { src, sizes, breakpoints })
    : normalizeLegacySources(src, sizes, breakpoints)
  if (pictureSources.length === 0) return null

  const fallback = pictureSources[pictureSources.length - 1]
  const fallbackFormat = getFallbackSource(fallback.img)
  const fallbackImage = fallbackFormat.images[0] || fallback.img.images?.[0]
  const resolvedLoading = loading ?? (preload ? 'eager' : undefined)
  const resolvedFetchPriority = fetchPriority ?? (preload ? 'high' : undefined)
  const fallbackSizes = makeSizes(fallback.img, fallback.sizes, fallback.breakpoints)

  const picture = h(
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
            sizes: makeSizes(source.img, source.sizes, source.breakpoints),
            // oxlint-disable-next-line anti-slop/no-conditional-empty-object-spread -- Omit optional React props rather than passing empty values.
            ...(source.media ? { media: source.media } : {}),
            // oxlint-disable-next-line anti-slop/no-conditional-empty-object-spread -- Dimensions belong only on art-directed sources.
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
      decoding,
      ...getFetchPriorityProps(resolvedFetchPriority),
    }),
  )

  if (!preload) return picture
  return h(
    React.Fragment,
    null,
    createPreloads(pictureSources, {
      crossOrigin: imgProps.crossOrigin,
      fetchPriority: resolvedFetchPriority,
      referrerPolicy: imgProps.referrerPolicy,
    }),
    picture,
  )
})

function createPreloads(pictureSources, requestOptions) {
  const sources = getPreloadSources(pictureSources)
  const preloads = sources.map(source => {
    const formatSource = getFormatSources(source.img)[0] || getFallbackSource(source.img)
    const href = formatSource.images?.[0]?.path || source.img.src || firstSrcSetUrl(formatSource.srcSet)
    if (!href || !formatSource.srcSet) return null

    const options = {
      as: 'image',
      type: formatSource.type,
      imageSrcSet: formatSource.srcSet,
      imageSizes: makeSizes(source.img, source.sizes, source.breakpoints),
      // oxlint-disable-next-line anti-slop/no-conditional-empty-object-spread -- Omit media for the unconditional preload.
      ...(source.media ? { media: source.media } : {}),
      ...withoutUndefined(requestOptions),
    }
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- React 18/19 support requires feature detection.
    if (typeof ReactDOM.preload === 'function') {
      ReactDOM.preload(href, options)
      return null
    }

    const Head = require('next/head').default
    const { fetchPriority, ...linkOptions } = options
    return h(
      Head,
      { key: preloadKey(options) },
      h('link', { rel: 'preload', href: undefined, ...linkOptions, ...getFetchPriorityProps(fetchPriority) }),
    )
  })

  return preloads.some(Boolean) ? preloads : null
}

function getPreloadSources(pictureSources) {
  const conditional = pictureSources.filter(source => source.media)
  const fallback = pictureSources[pictureSources.length - 1]
  if (conditional.length === 0) return [fallback]
  if (conditional.length > 1) {
    throw new Error('next-img Picture preload supports at most one conditional art-direction source')
  }
  return [...conditional, { ...fallback, media: `not all and ${conditional[0].media}` }]
}

function firstSrcSetUrl(srcSet) {
  return srcSet?.split(',')[0]?.trim().split(/\s+/)[0]
}

function withoutUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
}

function getFetchPriorityProps(fetchPriority) {
  if (fetchPriority === undefined) return {}
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- React 18/19 DOM property support requires feature detection.
  return typeof ReactDOM.preload === 'function' ? { fetchPriority } : { fetchpriority: fetchPriority }
}

function preloadKey(options) {
  return [options.imageSrcSet, options.imageSizes, options.media].filter(Boolean).join(':')
}

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

function normalizeExplicitSources(sources, { src, sizes, breakpoints }) {
  if (!Array.isArray(sources)) throw new Error('next-img Picture sources must be an array')
  if (src !== undefined) throw new Error('next-img Picture cannot use src and sources together')
  if (sizes !== undefined) throw new Error('next-img Picture sizes must be set on each explicit source')
  if (breakpoints !== undefined) throw new Error('next-img Picture explicit sources use media instead of breakpoints')

  const normalized = []
  for (const [index, source] of sources.entries()) {
    if (!source || !source.src) {
      throw new Error(`next-img Picture source at index ${index} must provide a src`)
    }
    const isFallback = index === sources.length - 1
    if (!isFallback && !source.media) {
      throw new Error(`next-img Picture source at index ${index} must provide media`)
    }
    if (isFallback && source.media) {
      throw new Error('next-img Picture sources must end with an unconditional fallback')
    }

    normalized.push({
      img: unwrapModule(source.src),
      sizes: source.sizes,
      breakpoints: [],
      media: source.media || null,
    })
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
      format: getFormatFromType(img.type),
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
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Breakpoints intentionally accept a number or a complete media query.
  return typeof breakpoint === 'number' ? `(max-width: ${breakpoint}px)` : breakpoint
}

module.exports = { Picture }
